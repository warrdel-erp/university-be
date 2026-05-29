import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import { convertPageToImage, scanQrFromImage, extractPageRangeToBuffer } from "../utility/pdfSplitter.js";
import AnswerSheetQrModel from "../models/answerSheetQrModel.js";
import { PDFDocument } from "pdf-lib";
import * as s3Helper from "../utility/s3Helper.js";
import * as s3FileRepository from "../repository/s3FileRepository.js";
import * as pdfSplitJobRepository from "../repository/pdfSplitJobRepository.js";
import { getPdfSplitQueue, getPdfSplitBatchQueue } from "../queue/pdfSplitQueue.js";
import sequelize from "../database/sequelizeConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_PER_STUDENT = 2;

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ─── Pre-flight Disk Checks ─────────────────────────────────────────────────

/**
 * Check if another PDF split job temp file is already present in /tmp.
 * Returns the filenames if found, otherwise null.
 */
export function checkActiveSplitTempFiles() {
  try {
    const tmpDir = os.tmpdir();
    const existing = fs.readdirSync(tmpDir).filter(
      (f) => f.startsWith("pdf-split-") && f.endsWith(".pdf")
    );
    return existing.length > 0 ? existing : null;
  } catch {
    return null; // If we can't read /tmp, don't block
  }
}

/**
 * Check whether at least `requiredBytes` of free disk space is available in /tmp.
 * Uses `fs.statfs` (Node 18.15+), falls back to allowing if unsupported.
 *
 * @param {number} requiredBytes
 * @returns {Promise<{ sufficient: boolean, freeBytes: number, requiredBytes: number }>}
 */
export async function checkDiskSpace(requiredBytes) {
  try {
    const tmpDir = os.tmpdir();
    // fs.promises.statfs available in Node 18.15+
    if (typeof fs.promises.statfs === "function") {
      const stats = await fs.promises.statfs(tmpDir);
      const freeBytes = stats.bavail * stats.bsize;
      return { sufficient: freeBytes >= requiredBytes, freeBytes, requiredBytes };
    }
    // Fallback: allow if statfs unavailable
    return { sufficient: true, freeBytes: -1, requiredBytes };
  } catch {
    return { sufficient: true, freeBytes: -1, requiredBytes };
  }
}

// ─── Queue Producer ──────────────────────────────────────────────────────────

/**
 * Enqueues a PDF split job.
 *
 * @param {string} s3Key
 * @param {number} instituteId
 * @param {number} universityId
 * @param {number} createdBy
 * @returns {Promise<{ jobId: string, jobDbId: string }>}
 */
export async function enqueuePdfSplitJob(s3Key, instituteId, universityId, createdBy) {
  // Create DB audit record first (PENDING)
  const dbJob = await pdfSplitJobRepository.createJob({
    s3Key,
    instituteId,
    universityId,
    createdBy,
    status: "PENDING",
    progress: 0,
    processedStudents: 0,
  });

  const queue = getPdfSplitQueue();
  const bullmqJob = await queue.add(
    "split-pdf",
    {
      s3Key,
      jobDbId: dbJob.id,
      instituteId,
      universityId,
      createdBy,
    },
    { jobId: uuidv4() }
  );

  // Persist BullMQ job id back to DB record
  await pdfSplitJobRepository.updateJob(dbJob.id, { bullmqJobId: bullmqJob.id });

  return { jobId: bullmqJob.id, jobDbId: dbJob.id };
}

// ─── Job Status (reads from DB — persistent) ─────────────────────────────────

/**
 * Get the current status of a PDF split job.
 * Also queries BullMQ for per-batch job states so the FE can see exactly
 * which batches are pending / active / completed / failed.
 *
 * @param {string} jobDbId - UUID of the pdf_split_jobs record
 * @returns {Promise<Object|null>}
 */
export async function getPdfSplitJobStatus(jobDbId) {
  const job = await pdfSplitJobRepository.getJobById(jobDbId);
  if (!job) return null;

  // Build per-batch detail array (optional — only available while SPLITTING)
  let batchDetails = null;
  if (job.batchJobIds && job.batchJobIds.length > 0) {
    try {
      const batchQueue = getPdfSplitBatchQueue();
      batchDetails = await Promise.all(
        job.batchJobIds.map(async (batchJobId, idx) => {
          const batchJob = await batchQueue.getJob(batchJobId);
          if (!batchJob) return { batchIndex: idx, jobId: batchJobId, state: "unknown" };
          const state = await batchJob.getState();
          return {
            batchIndex: idx,
            jobId: batchJobId,
            state,                                     // waiting | active | completed | failed | delayed
            attemptsMade: batchJob.attemptsMade,
            failedReason: batchJob.failedReason || null,
            processedOn: batchJob.processedOn || null,
            finishedOn: batchJob.finishedOn || null,
          };
        })
      );
    } catch {
      batchDetails = null; // Non-fatal — batch queue may not be running
    }
  }

  // Compute a clean progress percentage for the FE
  let progress = job.progress;
  if (job.status === "COMPLETED" || job.status === "PARTIALLY_COMPLETED") progress = 100;

  return {
    id: job.id,
    bullmqJobId: job.bullmqJobId,
    s3Key: job.s3Key,
    status: job.status,
    progress,
    // Student-level counters
    totalStudents: job.totalStudents,
    processedStudents: job.processedStudents,
    // Batch-level counters
    totalBatches: job.totalBatches,
    completedBatches: job.completedBatches,
    failedBatches: job.failedBatches,
    batchDetails,             // Per-batch BullMQ state (null if not yet fanned-out)
    // Error / result
    errorMessage: job.errorMessage,
    errorDetails: job.errorDetails,
    resultSummary: job.resultSummary,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

// ─── Legacy synchronous split (kept for small PDFs / backward compat) ─────────

async function getPdfPageCount(pdfBuffer) {
  const srcPdfBytes = new Uint8Array(pdfBuffer);
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw createServiceError("The uploaded PDF has no pages.", 400);
  }

  return { srcPdfBytes, totalPages };
}

async function scanQrCodesFromPdf(srcPdfBytes, totalPages) {
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

    try {
      imageBuffer = await convertPageToImage(srcPdfBytes, pageIndex);
    } catch (convErr) {
      scanErrors.push({
        page: humanPage,
        reason: `Could not render page ${humanPage} to an image buffer. ${convErr.message}`,
      });
      continue;
    }

    let qrValue = await scanQrFromImage(imageBuffer);

    if (!qrValue) {
      scanErrors.push({
        page: humanPage,
        reason:
          `No QR code was detected on page ${humanPage}. ` +
          `Please ensure a valid QR code is printed at the top-right quarter of every ${PAGES_PER_STUDENT}th page (pages 1, 31, 61, …).`,
      });
    } else {
      if (qrValue.includes("/")) {
        qrValue = qrValue.split("/").pop();
      }
      scannedQrs.push({ pageIndex, qrValue });
    }
  }

  if (scanErrors.length > 0) {
    const details = scanErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
    const error = new Error(
      `QR scanning failed on ${scanErrors.length} of ${totalSegments} page(s). ` +
        `No files have been created. Please fix the issues and re-upload.\n\n${details}`
    );
    error.statusCode = 422;
    error.scanErrors = scanErrors;
    throw error;
  }

  return scannedQrs;
}

async function validateScannedQrsAgainstDb(scannedQrs, instituteId, universityId) {
  const scannedValues = scannedQrs.map((s) => s.qrValue);

  const dbRows = await AnswerSheetQrModel.findAll({
    where: {
      qr: { [Op.in]: scannedValues },
      instituteId,
      universityId,
    },
    attributes: ["id", "qr", "studentId", "examScheduleId", "fileUploadId"],
  });

  const dbMap = new Map(dbRows.map((r) => [r.qr, r]));
  const validationErrors = [];

  for (const { pageIndex, qrValue } of scannedQrs) {
    const humanPage = pageIndex + 1;
    const row = dbMap.get(qrValue);

    if (!row) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The QR code on page ${humanPage} ("${qrValue}") was not found in this institute's system. ` +
          `It may belong to a different institute or may not have been generated through this system.`,
      });
      continue;
    }

    if (row.fileUploadId) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The answer sheet on page ${humanPage} (QR: ${qrValue}) has already been processed and uploaded. ` +
          `It cannot be processed again.`,
      });
      continue;
    }

    if (!row.studentId) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The answer sheet on page ${humanPage} (QR: ${qrValue}) has not been assigned to a student yet. ` +
          `Please map this QR to a student before splitting the PDF.`,
      });
      continue;
    }

    if (!row.examScheduleId) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The answer sheet on page ${humanPage} (QR: ${qrValue}) has not been linked to an exam schedule yet. ` +
          `Please map this QR to an exam schedule before splitting the PDF.`,
      });
    }
  }

  if (validationErrors.length > 0) {
    const totalSegments = scannedQrs.length;
    const details = validationErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
    const error = new Error(
      `Validation failed for ${validationErrors.length} of ${totalSegments} answer sheet(s). ` +
        `No files have been created. Please resolve the issues and re-upload.\n\n${details}`
    );
    error.statusCode = 422;
    error.validationErrors = validationErrors;
    throw error;
  }

  return dbMap;
}

async function splitAndSaveAnswerSheets(srcPdfBytes, scannedQrs, dbMap, instituteId, universityId, createdBy) {
  const transaction = await sequelize.transaction();
  const results = [];

  try {
    for (let seg = 0; seg < scannedQrs.length; seg++) {
      const { pageIndex, qrValue } = scannedQrs[seg];
      const startPage = pageIndex;
      const endPage = startPage + PAGES_PER_STUDENT - 1;

      const fileName = `${qrValue}.pdf`;
      const pdfBuffer = await extractPageRangeToBuffer(srcPdfBytes, startPage, endPage);
      const uniquePrefix = uuidv4();
      const s3Key = `answer-sheets/${uniquePrefix}-${fileName}`;
      const s3Url = await s3Helper.uploadFileToS3(pdfBuffer, s3Key, "application/pdf");

      const dbRow = dbMap.get(qrValue);

      const s3File = await s3FileRepository.createS3FileEntry(
        {
          entityType: "answer_sheet",
          entityId: dbRow.id ? String(dbRow.id) : null,
          companyId: Number(instituteId || universityId || 0) || null,
          size: pdfBuffer.length,
          mime: "application/pdf",
          status: "active",
          s3Key,
          originalName: fileName,
          createdBy,
        },
        transaction,
      );

      const [updatedRows] = await AnswerSheetQrModel.update(
        { fileUploadId: s3File.id },
        { where: { id: dbRow.id }, transaction },
      );

      if (updatedRows === 0) {
        throw createServiceError(`Failed to update AnswerSheet QR record (QR: ${qrValue}). 0 rows updated.`);
      }

      results.push({
        qr: qrValue,
        filePath: path.join("uploads", "answer-sheets", fileName),
        s3Key,
        s3Url,
        studentId: dbRow.studentId,
        examScheduleId: dbRow.examScheduleId,
        fileUploadId: s3File.id,
      });
    }

    await transaction.commit();
    return { totalStudents: results.length, results };
  } catch (txError) {
    await transaction.rollback();
    throw txError;
  }
}

/**
 * @deprecated Use enqueuePdfSplitJob for large PDFs.
 * Legacy synchronous split — suitable only for small PDFs.
 */
export async function splitAnswerSheetPdf(pdfBuffer, instituteId, universityId, createdBy) {
  try {
    const { srcPdfBytes, totalPages } = await getPdfPageCount(pdfBuffer);
    const scannedQrs = await scanQrCodesFromPdf(srcPdfBytes, totalPages);
    const dbMap = await validateScannedQrsAgainstDb(scannedQrs, instituteId, universityId);
    return await splitAndSaveAnswerSheets(srcPdfBytes, scannedQrs, dbMap, instituteId, universityId, createdBy);
  } catch (err) {
    throw err;
  }
}
