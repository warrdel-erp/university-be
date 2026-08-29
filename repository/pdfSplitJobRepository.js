import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createJob(data) {
  try {
    const initialStatus = data.status ?? "PENDING";
    return scoped(model.pdfSplitJobModel).create({
      ...data,
      statusLog: [
        { event: "JOB_CREATED", status: initialStatus, progress: data.progress ?? 0, timestamp: new Date().toISOString() },
      ],
    });
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.createJob:", error);
    throw error;
  }
}

export async function updateJob(id, data) {
  try {
    const existing = await scoped(model.pdfSplitJobModel).findByPk(id);
    if (!existing) {
      return;
    }

    await scoped(model.pdfSplitJobModel).update(data, { where: { id } });

    // Append a timestamped entry to statusLog on every status change
    if (data.status !== undefined) {
      const entry = JSON.stringify({
        event: "STATUS_CHANGE",
        status: data.status,
        progress: data.progress ?? existing.progress,
        timestamp: new Date().toISOString(),
      });
      const db = model.pdfSplitJobModel.sequelize;
      const { QueryTypes } = await import("sequelize");
      await db.query(
        `UPDATE pdf_split_jobs
         SET status_log = JSON_ARRAY_APPEND(
           COALESCE(status_log, JSON_ARRAY()),
           '$',
           CAST(:entry AS JSON)
         )
         WHERE id = :id`,
        { replacements: { id, entry }, type: QueryTypes.UPDATE }
      );
    }
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.updateJob:", error);
    throw error;
  }
}

export async function getJobById(id) {
  try {
    return scoped(model.pdfSplitJobModel).findByPk(id);
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.getJobById:", error);
    throw error;
  }
}

export async function getJobByBullmqId(bullmqJobId) {
  try {
    return scoped(model.pdfSplitJobModel).findOne({ where: { bullmqJobId } });
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.getJobByBullmqId:", error);
    throw error;
  }
}

export async function findSuccessfulJobByAnswerSheetId(examSessionAnswerSheetId) {
  try {
    const { Op } = await import("sequelize");
    return scoped(model.pdfSplitJobModel).findOne({
      where: {
        examSessionAnswerSheetId,
        status: { [Op.in]: ["COMPLETED", "PARTIALLY_COMPLETED"] },
      },
    });
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.findSuccessfulJobByAnswerSheetId:", error);
    throw error;
  }
}

/**
 * Atomically appends a structured event entry to statusLog.
 * Non-throwing — a logging failure must never crash a worker.
 *
 * @param {string} id  - pdfSplitJob UUID
 * @param {object} entry  - any serialisable object; timestamp is added automatically
 */
export async function appendLog(id, entry) {
  try {
    const { QueryTypes } = await import("sequelize");
    const db = model.pdfSplitJobModel.sequelize;
    const fullEntry = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
    await db.query(
      `UPDATE pdf_split_jobs
       SET status_log = JSON_ARRAY_APPEND(
         COALESCE(status_log, JSON_ARRAY()),
         '$',
         CAST(:entry AS JSON)
       )
       WHERE id = :id`,
      { replacements: { id, entry: fullEntry }, type: QueryTypes.UPDATE }
    );
  } catch (error) {
    // Non-fatal — log to console but never propagate
    console.error("[appendLog] Failed to write event log entry:", error.message);
  }
}

export async function incrementCompletedBatches(id, segmentCount) {
  try {
    const existing = await scoped(model.pdfSplitJobModel).findByPk(id);
    if (!existing) {
      throw new Error("PDF split job not found");
    }

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

export async function incrementFailedBatches(id) {
  try {
    const existing = await scoped(model.pdfSplitJobModel).findByPk(id);
    if (!existing) {
      throw new Error("PDF split job not found");
    }

    await model.pdfSplitJobModel.increment({ failedBatches: 1 }, { where: { id } });
    return model.pdfSplitJobModel.findByPk(id);
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.incrementFailedBatches:", error);
    throw error;
  }
}

export async function getJobsByS3Keys(s3Keys) {
  try {
    const { Op } = await import("sequelize");
    return scoped(model.pdfSplitJobModel).findAll({
      where: { s3Key: { [Op.in]: s3Keys } },
    });
  } catch (error) {
    console.error("Error in pdfSplitJobRepository.getJobsByS3Keys:", error);
    throw error;
  }
}

export async function appendFailedBatchDetail(id, batchDetail) {
  try {
    const existing = await scoped(model.pdfSplitJobModel).findByPk(id);
    if (!existing) {
      return;
    }

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
    console.error("Error in pdfSplitJobRepository.appendFailedBatchDetail:", error);
  }
}
