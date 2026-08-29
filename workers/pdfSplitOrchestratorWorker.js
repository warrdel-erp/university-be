/**
 * pdfSplitOrchestratorWorker.js
 *
 * BullMQ Worker — ORCHESTRATOR  (queue: pdf-split-queue, concurrency: 1)
 *
 * Responsibilities:
 *   DOWNLOADING   → Stream S3 → /tmp/pdf-split-{jobDbId}.pdf  (no JS heap load)
 *   SCANNING_QR   → pdf-poppler renders each QR page → jsQR decodes the code
 *   VALIDATING_DB → Bulk SELECT to verify all scanned QRs against the DB
 *   FAN-OUT       → Enqueue N independent batch jobs to pdf-split-batch-queue
 *                   (temp file is intentionally kept alive for batch workers)
 *
 * Retry semantics: attempts = 1
 *   If orchestration fails the user must re-submit. The job has no partial state
 *   worth retrying at this stage — it hasn't written anything yet.
 */

import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { Worker } from "bullmq";
import { Op } from "sequelize";

import { getRedisConnection } from "../queue/redisConnection.js";
import { PDF_SPLIT_QUEUE_NAME, getPdfSplitBatchQueue } from "../queue/pdfSplitQueue.js";
import { convertPageToImageFromFile, scanQrFromImage } from "../utility/pdfSplitter.js";
import { pdfinfoGetPageCount } from "../utility/cliToolWrapper.js";
import AnswerSheetQrModel from "../models/answerSheetQrModel.js";
import * as pdfSplitJobRepository from "../repository/pdfSplitJobRepository.js";

import {
  PAGES_PER_STUDENT,
  BATCH_SIZE_STUDENTS,
  BATCH_CONCURRENCY,
  SPLIT_BATCH_SIZE_PAGES,
  getTempPdfPath,
  safeUnlink,
  downloadPdfToTemp,
} from "./pdfWorkerShared.js";


// ─── QR scanning helpers ──────────────────────────────────────────────────────

/**
 * Get page count using the system pdfinfo binary (from Homebrew poppler).
 * Delegates to cliToolWrapper.pdfinfoGetPageCount.
 */
async function getPdfPageCount(pdfFilePath) {
  return pdfinfoGetPageCount(pdfFilePath);
}

async function scanQrCodesFromFile(tempPdfPath, totalPages, jobDbId) {
  const qrPageIndices = [];
  for (let i = 0; i < totalPages; i += PAGES_PER_STUDENT) {
    qrPageIndices.push(i);
  }

  const totalSegments = qrPageIndices.length;
  const scannedQrs = [];
  const scanErrors = [];

  for (const pageIndex of qrPageIndices) {
    const humanPage = pageIndex + 1;
    let imageBuffer;
    console.log(`[Orchestrator] ${jobDbId}: Scanning page ${humanPage}/${totalPages} for QR...`);

    try {
      imageBuffer = await convertPageToImageFromFile(tempPdfPath, pageIndex, jobDbId);
    } catch (convErr) {
      scanErrors.push({
        page: humanPage,
        reason: `Could not render page ${humanPage} to image. ${convErr.message}`,
      });
      continue;
    }

    let qrValue = await scanQrFromImage(imageBuffer);

    if (!qrValue) {
      scanErrors.push({
        page: humanPage,
        reason:
          `No QR code detected on page ${humanPage}. ` +
          `Ensure a valid QR is printed at the top-right of every ${PAGES_PER_STUDENT}th page.`,
      });
    } else {
      if (qrValue.includes("/")) qrValue = qrValue.split("/").pop();
      scannedQrs.push({ pageIndex, qrValue });
    }
  }

  if (scanErrors.length > 0) {
    const details = scanErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
    const err = new Error(
      `QR scanning failed on ${scanErrors.length} of ${totalSegments} page(s). ` +
        `No files have been created. Please fix the issues and re-upload.\n\n${details}`
    );
    err.statusCode = 422;
    err.scanErrors = scanErrors;
    throw err;
  }

  return scannedQrs;
}

async function validateScannedQrs(scannedQrs, instituteId, universityId) {
  const scannedValues = scannedQrs.map((s) => s.qrValue);

  const dbRows = await AnswerSheetQrModel.findAll({
    where: { qr: { [Op.in]: scannedValues }, instituteId, universityId },
    attributes: ["id", "qr", "studentId", "examScheduleId", "fileUploadId"],
  });

  const dbMap = new Map(dbRows.map((r) => [r.qr, r]));
  const validationErrors = [];

  for (const { pageIndex, qrValue } of scannedQrs) {
    const humanPage = pageIndex + 1;
    const row = dbMap.get(qrValue);

    if (!row) {
      validationErrors.push({ page: humanPage, qr: qrValue, reason: `QR on page ${humanPage} ("${qrValue}") not found in system.` });
      continue;
    }
    if (row.fileUploadId) {
      validationErrors.push({ page: humanPage, qr: qrValue, reason: `Answer sheet on page ${humanPage} (QR: ${qrValue}) already processed.` });
      continue;
    }
    if (!row.studentId) {
      validationErrors.push({ page: humanPage, qr: qrValue, reason: `QR on page ${humanPage} has no student mapped.` });
      continue;
    }
    if (!row.examScheduleId) {
      validationErrors.push({ page: humanPage, qr: qrValue, reason: `QR on page ${humanPage} has no exam schedule mapped.` });
    }
  }

  if (validationErrors.length > 0) {
    const details = validationErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
    const err = new Error(
      `Validation failed for ${validationErrors.length} of ${scannedQrs.length} answer sheet(s).\n\n${details}`
    );
    err.statusCode = 422;
    err.validationErrors = validationErrors;
    throw err;
  }

  return dbMap;
}

// ─── Processor ────────────────────────────────────────────────────────────────

async function processOrchestratorJob(bullmqJob) {
  const { s3Key, jobDbId, instituteId, universityId, createdBy } = bullmqJob.data;
  // Named by jobDbId — stable, predictable path shared with all batch workers
  const tempPdfPath = getTempPdfPath(jobDbId);

  console.log(`[Orchestrator] Job ${bullmqJob.id} (DB: ${jobDbId}) starting — s3Key: ${s3Key}`);

  try {
    // ── Stage 1: DOWNLOADING ─────────────────────────────────────────────────
    await pdfSplitJobRepository.updateJob(jobDbId, { status: "DOWNLOADING", progress: 0 });
    await bullmqJob.updateProgress({ stage: "DOWNLOADING", percent: 0 });
    console.log(`[Orchestrator] ${jobDbId}: Downloading PDF from S3 → ${tempPdfPath}`);
    const downloadStart = Date.now();
    await downloadPdfToTemp(s3Key, tempPdfPath);
    await pdfSplitJobRepository.appendLog(jobDbId, {
      event: "DOWNLOADING_DONE",
      durationMs: Date.now() - downloadStart,
    });
    console.log(`[Orchestrator] ${jobDbId}: Download complete.`);

    // ── Stage 2: SCANNING_QR ─────────────────────────────────────────────────
    await pdfSplitJobRepository.updateJob(jobDbId, { status: "SCANNING_QR", progress: 5 });
    await bullmqJob.updateProgress({ stage: "SCANNING_QR", percent: 5 });
    console.log(`[Orchestrator] ${jobDbId}: Scanning QR codes...`);
    const scanStart = Date.now();
    const totalPages = await getPdfPageCount(tempPdfPath);
    await pdfSplitJobRepository.appendLog(jobDbId, { event: "SCANNING_QR_START", totalPages });
    const scannedQrs = await scanQrCodesFromFile(tempPdfPath, totalPages, jobDbId);
    const totalStudents = scannedQrs.length;
    console.log(`[Orchestrator] ${jobDbId}: Found ${totalStudents} student segments.`);
    await pdfSplitJobRepository.updateJob(jobDbId, { totalStudents, progress: 20 });
    await pdfSplitJobRepository.appendLog(jobDbId, {
      event: "SCANNING_QR_DONE",
      totalPages,
      totalStudents,
      durationMs: Date.now() - scanStart,
    });

    // ── Stage 3: VALIDATING_DB ───────────────────────────────────────────────
    await pdfSplitJobRepository.updateJob(jobDbId, { status: "VALIDATING_DB", progress: 25 });
    await bullmqJob.updateProgress({ stage: "VALIDATING_DB", percent: 25 });
    console.log(`[Orchestrator] ${jobDbId}: Validating QR codes against DB...`);
    const validateStart = Date.now();
    const dbMap = await validateScannedQrs(scannedQrs, instituteId, universityId);
    console.log(`[Orchestrator] ${jobDbId}: Validation passed.`);
    await pdfSplitJobRepository.appendLog(jobDbId, {
      event: "VALIDATING_DB_DONE",
      validatedCount: dbMap.size,
      durationMs: Date.now() - validateStart,
    });

    // ── Stage 4: FAN-OUT → Enqueue independent batch jobs ────────────────────
    const batches = [];
    for (let i = 0; i < scannedQrs.length; i += BATCH_SIZE_STUDENTS) {
      batches.push(scannedQrs.slice(i, i + BATCH_SIZE_STUDENTS));
    }
    const totalBatches = batches.length;

    const batchQueue = getPdfSplitBatchQueue();
    const batchJobIds = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const segments = batches[batchIndex].map(({ pageIndex, qrValue }) => {
        const row = dbMap.get(qrValue);
        return {
          pageIndex,
          qrValue,
          dbRowId: row.id,
          studentId: row.studentId,
          examScheduleId: row.examScheduleId,
        };
      });

      const batchJob = await batchQueue.add(
        "split-batch",
        {
          jobDbId,
          s3Key,             // For re-download if temp file missing after restart
          tempPdfPath,       // Expected path — batch worker checks existence first
          batchIndex,
          totalBatches,
          totalStudents,
          segments,
          instituteId,
          universityId,
          createdBy,
        },
        { jobId: uuidv4() }
      );

      batchJobIds.push(batchJob.id);
      await pdfSplitJobRepository.appendLog(jobDbId, {
        event: "BATCH_ENQUEUED",
        batchIndex,
        batchJobId: batchJob.id,
        segmentCount: segments.length,
      });
    }

    // Persist batch metadata to parent job record
    await pdfSplitJobRepository.updateJob(jobDbId, {
      status: "SPLITTING",
      progress: 30,
      totalBatches,
      completedBatches: 0,
      failedBatches: 0,
      batchJobIds,
    });
    await pdfSplitJobRepository.appendLog(jobDbId, {
      event: "SPLITTING_START",
      totalBatches,
      totalStudents,
    });
    await bullmqJob.updateProgress({ stage: "SPLITTING", percent: 30, totalBatches });

    console.log(
      `[Orchestrator] ${jobDbId}: Enqueued ${totalBatches} batch jobs ` +
        `(${BATCH_SIZE_STUDENTS} students each, concurrency: ${BATCH_CONCURRENCY}).`
    );

    // NOTE: temp file is intentionally NOT deleted here — batch workers need it.
    return { totalBatches, batchJobIds, totalStudents };
  } catch (err) {
    safeUnlink(tempPdfPath);

    await pdfSplitJobRepository.updateJob(jobDbId, {
      status: "FAILED",
      errorMessage: err.message,
      errorDetails: err.scanErrors || err.validationErrors || null,
    });
    await pdfSplitJobRepository.appendLog(jobDbId, {
      event: "JOB_FAILED",
      error: err.message,
      details: err.scanErrors || err.validationErrors || null,
    });

    console.error(`[Orchestrator] ${jobDbId} FAILED:`, err.message);
    throw err;
  }
}

// ─── Register worker ──────────────────────────────────────────────────────────

const orchestratorWorker = new Worker(PDF_SPLIT_QUEUE_NAME, processOrchestratorJob, {
  connection: getRedisConnection(),
  concurrency: 1, // Only one 5 GB download at a time
});

orchestratorWorker.on("completed", (job) => {
  console.log(`[Orchestrator] BullMQ job ${job.id} completed — batches enqueued.`);
});
orchestratorWorker.on("failed", (job, err) => {
  console.error(`[Orchestrator] BullMQ job ${job?.id} failed:`, err.message);
});
orchestratorWorker.on("error", (err) => {
  console.error("[Orchestrator] Worker error:", err.message);
});

console.log(
  `[Orchestrator] Worker started — queue="${PDF_SPLIT_QUEUE_NAME}", concurrency=1, ` +
    `batchSize=${BATCH_SIZE_STUDENTS} students (${SPLIT_BATCH_SIZE_PAGES} pages).`
);

export default orchestratorWorker;
