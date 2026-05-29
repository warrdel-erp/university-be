import { Queue } from "bullmq";
import { getRedisConnection } from "./redisConnection.js";

export const PDF_SPLIT_QUEUE_NAME = "pdf-split-queue";        // Orchestrator queue
export const PDF_SPLIT_BATCH_QUEUE_NAME = "pdf-split-batch-queue"; // Per-batch queue

let orchestrateQueue = null;
let batchQueue = null;

/**
 * Queue for orchestrator jobs (download + scan + validate + fan-out).
 * Attempts = 1 (no auto-retry — user must re-submit on orchestration failure).
 */
export function getPdfSplitQueue() {
  if (!orchestrateQueue) {
    orchestrateQueue = new Queue(PDF_SPLIT_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return orchestrateQueue;
}

/**
 * Queue for batch split jobs (qpdf extract + S3 upload + DB update).
 * Attempts = 3 with exponential backoff — each batch retries independently.
 */
export function getPdfSplitBatchQueue() {
  if (!batchQueue) {
    batchQueue = new Queue(PDF_SPLIT_BATCH_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return batchQueue;
}
