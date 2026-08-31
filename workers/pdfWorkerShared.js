/**
 * pdfWorkerShared.js
 *
 * Shared config, helpers, and finalization logic used by both:
 *   - pdfSplitOrchestratorWorker.js
 *   - pdfSplitBatchWorker.js
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import os from "os";
import { pipeline } from "stream/promises";
import { AWS_BUCKET_NAME, AWS_BUCKET_PREFIX, s3Client as s3 } from "../utility/awsConfig.js";

import * as pdfSplitJobRepository from "../repository/pdfSplitJobRepository.js";

// ─── Config ───────────────────────────────────────────────────────────────────

export const PAGES_PER_STUDENT = 2;

export const SPLIT_BATCH_SIZE_PAGES = Number(process.env.SPLIT_BATCH_SIZE_PAGES) || 60;

/** Always a whole number of students per batch */
export const BATCH_SIZE_STUDENTS = Math.max(
  1,
  Math.floor(SPLIT_BATCH_SIZE_PAGES / PAGES_PER_STUDENT)
);

/**
 * How many batch jobs run in parallel.
 * Each batch processes BATCH_SIZE_STUDENTS answer sheets concurrently.
 */
export const BATCH_CONCURRENCY = Number(process.env.SPLIT_BATCH_CONCURRENCY) || 3;

// Re-export for workers
export { AWS_BUCKET_NAME, AWS_BUCKET_PREFIX, s3 };

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Temp file path for the source PDF.
 * Named by jobDbId (UUID) so it is STABLE and predictable by all batch jobs,
 * even across server restarts.
 */
export function getTempPdfPath(jobDbId) {
  return path.join(os.tmpdir(), `pdf-split-${jobDbId}.pdf`);
}

export function getTempSplitPath(jobDbId, qrValue) {
  return path.join(os.tmpdir(), `split-${jobDbId}-${qrValue}.pdf`);
}

export function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) { /* non-fatal */ }
}

// ─── S3 download ──────────────────────────────────────────────────────────────

/**
 * Stream a file from S3 directly to a local temp file — no JS heap buffering.
 */
export async function downloadPdfToTemp(s3Key, tempPath) {
  const readStream = s3
    .getObject({ Bucket: AWS_BUCKET_NAME, Key: AWS_BUCKET_PREFIX + s3Key })
    .createReadStream();
  const writeStream = fs.createWriteStream(tempPath);
  await pipeline(readStream, writeStream);
}

// ─── Finalization (shared by batch worker processor + failed event handler) ───

/**
 * Called whenever completedBatches or failedBatches increments.
 *
 * If all batches are accounted for (completed + failed >= total):
 *  - Re-fetches the job for fresh error_details (written atomically by appendFailedBatchDetail)
 *  - Flattens failed segment details into resultSummary.failedSegments
 *  - Marks parent job COMPLETED or PARTIALLY_COMPLETED
 *  - Cleans up the source PDF temp file
 *
 * @param {Object} jobRecord - Returned by incrementCompletedBatches / incrementFailedBatches
 */
export async function finalizeParentJobIfDone(jobRecord) {
  const { id, completedBatches, failedBatches, totalBatches, totalStudents } = jobRecord;
  if ((completedBatches + failedBatches) < totalBatches) return;

  // Re-fetch for fresh error_details (concurrent appendFailedBatchDetail writes)
  const freshJob = await pdfSplitJobRepository.getJobById(id);

  safeUnlink(getTempPdfPath(id));

  // Flatten every failed student across all failed batches
  const failedBatchDetails = Array.isArray(freshJob.errorDetails) ? freshJob.errorDetails : [];
  const failedSegments = failedBatchDetails.flatMap((b) =>
    (b.segments || []).map((s) => ({
      batchIndex: b.batchIndex,
      page: s.pageIndex + 1,         // Human-readable 1-indexed page number
      qrValue: s.qrValue,
      studentId: s.studentId,
      examScheduleId: s.examScheduleId,
      failedReason: b.failedReason,
      attemptsMade: b.attemptsMade,
    }))
  );

  const status = freshJob.failedBatches === 0 ? "COMPLETED" : "PARTIALLY_COMPLETED";
  const progress = freshJob.failedBatches === 0
    ? 100
    : Math.round((freshJob.processedStudents / totalStudents) * 100);

  const resultSummary = {
    totalStudents: freshJob.totalStudents,
    processedStudents: freshJob.processedStudents,
    failedStudentsCount: failedSegments.length,
    /**
     * Full per-student failure details — page, QR code, studentId, reason, attempts.
     * Omitted (undefined) when job is COMPLETED with no failures.
     */
    failedSegments: failedSegments.length > 0 ? failedSegments : undefined,
    totalBatches: freshJob.totalBatches,
    completedBatches: freshJob.completedBatches,
    failedBatches: freshJob.failedBatches,
  };

  await pdfSplitJobRepository.updateJob(id, { status, progress, resultSummary });
  await pdfSplitJobRepository.appendLog(id, {
    event: "JOB_FINALIZED",
    status,
    processedStudents: freshJob.processedStudents,
    totalStudents,
    failedStudentsCount: failedSegments.length,
    completedBatches: freshJob.completedBatches,
    failedBatches: freshJob.failedBatches,
    totalBatches: freshJob.totalBatches,
  });

  console.log(
    `[PdfWorker] Parent job ${id} finalized → ${status} ` +
    `(${freshJob.completedBatches} ok, ${freshJob.failedBatches} failed of ${freshJob.totalBatches} batches, ` +
    `${freshJob.processedStudents}/${totalStudents} students). ` +
    (failedSegments.length > 0 ? `${failedSegments.length} student(s) failed.` : "All students OK.")
  );
}
