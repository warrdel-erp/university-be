import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";

/**
 * Create a new pdf_split_jobs record.
 */
export async function createJob(data) {
  try {
    return await model.pdfSplitJobModel.create(data);
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.createJob:", error);
    throw error;
  }
}

/**
 * Update a pdf_split_jobs record by its DB UUID.
 */
export async function updateJob(id, data) {
  try {
    await model.pdfSplitJobModel.update(data, { where: { id } });
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.updateJob:", error);
    throw error;
  }
}

/**
 * Get a pdf_split_jobs record by its DB UUID.
 */
export async function getJobById(id) {
  try {
    return await model.pdfSplitJobModel.findByPk(id);
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.getJobById:", error);
    throw error;
  }
}

/**
 * Get a pdf_split_jobs record by its BullMQ orchestrator job id.
 */
export async function getJobByBullmqId(bullmqJobId) {
  try {
    return await model.pdfSplitJobModel.findOne({ where: { bullmqJobId } });
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.getJobByBullmqId:", error);
    throw error;
  }
}

/**
 * Atomically increment completedBatches and processedStudents for a job.
 * Returns the updated job record (including current counter values).
 *
 * Used by batch workers to update parent job progress after each batch completes.
 *
 * @param {string} id           - pdf_split_jobs UUID
 * @param {number} segmentCount - Number of student segments in the completed batch
 * @returns {Promise<Object>}   - Updated job record
 */
export async function incrementCompletedBatches(id, segmentCount) {
  try {
    // SQL-level atomic increment — safe under parallel batch concurrency
    await model.pdfSplitJobModel.increment(
      { completedBatches: 1, processedStudents: segmentCount },
      { where: { id } }
    );
    return model.pdfSplitJobModel.findByPk(id);
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.incrementCompletedBatches:", error);
    throw error;
  }
}

/**
 * Atomically increment failedBatches for a job.
 * Only called on the FINAL failure of a batch (all retries exhausted).
 *
 * @param {string} id - pdf_split_jobs UUID
 * @returns {Promise<Object>} - Updated job record
 */
export async function incrementFailedBatches(id) {
  try {
    await model.pdfSplitJobModel.increment({ failedBatches: 1 }, { where: { id } });
    return model.pdfSplitJobModel.findByPk(id);
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.incrementFailedBatches:", error);
    throw error;
  }
}

/**
 * Atomically append a failed-batch detail object to the error_details JSON array.
 *
 * Uses MySQL's JSON_ARRAY_APPEND so this is safe when multiple batches fail
 * simultaneously — no fetch-merge-save race condition.
 *
 * @param {string} id          - pdf_split_jobs UUID
 * @param {Object} batchDetail - { batchIndex, failedReason, attemptsMade, segments[] }
 */
export async function appendFailedBatchDetail(id, batchDetail) {
  try {
    const { QueryTypes } = await import("sequelize");
    const db = model.pdfSplitJobModel.sequelize;

    await db.query(
      `UPDATE pdf_split_jobs
       SET error_details = JSON_ARRAY_APPEND(
         COALESCE(error_details, JSON_ARRAY()),
         '$',
         CAST(:detail AS JSON)
       )
       WHERE id = :id`,
      {
        replacements: { id, detail: JSON.stringify(batchDetail) },
        type: QueryTypes.UPDATE,
      }
    );
  } catch (error) {
    // Non-fatal — log and continue so the failed-batch counter still increments
    console.error("Error in pdfSplitJobRepository.appendFailedBatchDetail:", error);
  }
}
