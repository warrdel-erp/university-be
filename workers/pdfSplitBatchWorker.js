/**
 * pdfSplitBatchWorker.js
 *
 * BullMQ Worker — BATCH PROCESSOR  (queue: pdf-split-batch-queue)
 *
 * Responsibilities (per batch job):
 *   - Verify the source PDF temp file exists; re-download from S3 if missing
 *     (handles server restarts between orchestration and batch execution)
 *   - For each segment in the batch:
 *       • qpdf: extract the student's page range from the source PDF
 *       • Upload the split PDF to S3
 *       • Create s3_files DB record + link to AnswerSheetQr (single transaction)
 *   - Atomically increment completedBatches on the parent job
 *   - If this is the last batch → finalize parent job + clean up temp file
 *
 * Retry semantics: attempts = 3, exponential backoff 5s
 *   Each batch retries independently — a transient S3 or DB error only re-runs
 *   that batch, not the entire PDF pipeline.
 *
 *   failedBatches is incremented ONLY on the FINAL failure (all retries exhausted),
 *   and the failing segments are stored in error_details for the final report.
 */

import "dotenv/config";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Worker } from "bullmq";
import AWS from "aws-sdk";

import { getRedisConnection } from "../queue/redisConnection.js";
import { PDF_SPLIT_BATCH_QUEUE_NAME } from "../queue/pdfSplitQueue.js";
import { extractPageRangeViaQpdf } from "../utility/pdfSplitter.js";
import AnswerSheetQrModel from "../models/answerSheetQrModel.js";
import * as s3FileRepository from "../repository/s3FileRepository.js";
import * as pdfSplitJobRepository from "../repository/pdfSplitJobRepository.js";
import sequelize from "../database/sequelizeConfig.js";

import {
  PAGES_PER_STUDENT,
  BATCH_CONCURRENCY,
  AWS_BUCKET_NAME,
  AWS_BUCKET_PREFIX,
  s3,
  getTempPdfPath,
  getTempSplitPath,
  safeUnlink,
  downloadPdfToTemp,
  finalizeParentJobIfDone,
} from "./pdfWorkerShared.js";

// ─── Processor ────────────────────────────────────────────────────────────────

async function processBatchJob(bullmqJob) {
  const {
    jobDbId,
    s3Key,
    tempPdfPath,
    batchIndex,
    totalBatches,
    totalStudents,
    segments,
    instituteId,
    universityId,
    createdBy,
  } = bullmqJob.data;

  console.log(
    `[BatchWorker] Job ${bullmqJob.id} — parent ${jobDbId}, ` +
      `batch ${batchIndex + 1}/${totalBatches} (${segments.length} students)`
  );

  // ── Ensure source PDF is available ───────────────────────────────────────
  // May be missing if the server restarted after orchestration but before this batch ran.
  let resolvedTempPath = tempPdfPath;
  if (!fs.existsSync(resolvedTempPath)) {
    console.warn(
      `[BatchWorker] Temp file missing at ${resolvedTempPath}. Re-downloading from S3...`
    );
    resolvedTempPath = getTempPdfPath(jobDbId);
    await downloadPdfToTemp(s3Key, resolvedTempPath);
    console.log(`[BatchWorker] Re-download complete → ${resolvedTempPath}`);
  }

  const results = [];
  const transaction = await sequelize.transaction();

  try {
    for (const { pageIndex, qrValue, dbRowId, studentId, examScheduleId } of segments) {
      const startPage = pageIndex + 1;               // qpdf is 1-indexed
      const endPage = startPage + PAGES_PER_STUDENT - 1;
      const splitPath = getTempSplitPath(jobDbId, qrValue);

      // Extract page range — qpdf only reads the bytes it needs from the large file
      await extractPageRangeViaQpdf(resolvedTempPath, startPage, endPage, splitPath);

      // Upload the small split PDF to S3
      const fileName = `${qrValue}.pdf`;
      const s3DestKey = `answer-sheets/${uuidv4()}-${fileName}`;
      const splitBuffer = fs.readFileSync(splitPath);

      const s3Result = await s3
        .upload({
          Bucket: AWS_BUCKET_NAME,
          Key: AWS_BUCKET_PREFIX + s3DestKey,
          Body: splitBuffer,
          ContentType: "application/pdf",
        })
        .promise();

      safeUnlink(splitPath); // Already uploaded — remove the tiny temp file

      // Create s3_files record
      const s3File = await s3FileRepository.createS3FileEntry(
        {
          entityType: "answer_sheet",
          entityId: String(dbRowId),
          companyId: Number(instituteId || universityId || 0) || null,
          size: splitBuffer.length,
          mime: "application/pdf",
          status: "active",
          s3Key: s3DestKey,
          originalName: fileName,
          createdBy,
        },
        transaction
      );

      // Link the uploaded file to the AnswerSheetQr record
      const [updatedRows] = await AnswerSheetQrModel.update(
        { fileUploadId: s3File.id },
        { where: { id: dbRowId }, transaction }
      );

      if (updatedRows === 0) {
        throw new Error(`Failed to update AnswerSheetQr id=${dbRowId} (QR: ${qrValue}).`);
      }

      results.push({
        qr: qrValue,
        s3Key: s3DestKey,
        s3Url: s3Result.Location,
        studentId,
        examScheduleId,
        fileUploadId: s3File.id,
      });
    }

    await transaction.commit();

    // ── Atomically update parent job progress ─────────────────────────────
    const updatedJob = await pdfSplitJobRepository.incrementCompletedBatches(
      jobDbId,
      segments.length
    );

    const progressPct = Math.min(
      99, // Reserve 100% for finalization
      30 + Math.round((updatedJob.processedStudents / totalStudents) * 70)
    );
    await pdfSplitJobRepository.updateJob(jobDbId, { progress: progressPct });

    console.log(
      `[BatchWorker] Batch ${batchIndex + 1}/${totalBatches} complete — ` +
        `${updatedJob.completedBatches} batches done, ` +
        `${updatedJob.processedStudents}/${totalStudents} students`
    );

    // ── Check if this was the last batch ─────────────────────────────────
    await finalizeParentJobIfDone(updatedJob);

    return results;
  } catch (err) {
    await transaction.rollback();
    console.error(
      `[BatchWorker] Batch ${batchIndex + 1}/${totalBatches} attempt ${bullmqJob.attemptsMade + 1} failed:`,
      err.message
    );
    throw err; // BullMQ handles retry
  }
}

// ─── Register worker ──────────────────────────────────────────────────────────

const batchWorker = new Worker(PDF_SPLIT_BATCH_QUEUE_NAME, processBatchJob, {
  connection: getRedisConnection(),
  concurrency: BATCH_CONCURRENCY,
});

batchWorker.on("completed", (job) => {
  console.log(`[BatchWorker] BullMQ job ${job.id} completed.`);
});

/**
 * On final failure (all retries exhausted):
 * 1. Persist segment details to error_details via atomic JSON_ARRAY_APPEND.
 *    (So the final report includes which exact students failed and why.)
 * 2. Increment failedBatches counter.
 * 3. Finalize parent job if all batches are now accounted for.
 *
 * Storing details BEFORE incrementing ensures they are present when finalize runs.
 */
batchWorker.on("failed", async (job, err) => {
  if (!job) return;

  const isLastAttempt = job.attemptsMade >= (job.opts?.attempts || 1);
  if (!isLastAttempt) {
    console.warn(
      `[BatchWorker] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts?.attempts}) — will retry.`
    );
    return;
  }

  console.error(
    `[BatchWorker] Job ${job.id} permanently failed (${job.attemptsMade} attempts):`,
    err.message
  );

  const { jobDbId, batchIndex, segments } = job.data;

  try {
    // Step 1: persist failed segment details for the final report
    await pdfSplitJobRepository.appendFailedBatchDetail(jobDbId, {
      batchIndex,
      failedReason: err.message,
      attemptsMade: job.attemptsMade,
      segments, // { pageIndex, qrValue, dbRowId, studentId, examScheduleId }
    });

    // Step 2: atomic counter + finalization
    const updatedJob = await pdfSplitJobRepository.incrementFailedBatches(jobDbId);
    await finalizeParentJobIfDone(updatedJob);
  } catch (repoErr) {
    console.error("[BatchWorker] Failed to update parent job after final failure:", repoErr.message);
  }
});

batchWorker.on("error", (err) => {
  console.error("[BatchWorker] Worker error:", err.message);
});

console.log(
  `[BatchWorker] Worker started — queue="${PDF_SPLIT_BATCH_QUEUE_NAME}", concurrency=${BATCH_CONCURRENCY}.`
);

export default batchWorker;
