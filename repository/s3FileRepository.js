import * as model from "../models/index.js";

/**
 * Creates a new S3 file record.
 * @param {Object} data - S3 file metadata
 * @param {Object} [transaction] - Sequelize transaction
 */
export async function createS3FileEntry(data, transaction) {
  try {
    const result = await model.s3FileModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in createS3File repository:", error);
    throw error;
  }
}

/**
 * Retrieves an S3 file record by ID.
 * @param {string} id - The UUID of the S3 file
 * @param {Object} [transaction] - Sequelize transaction
 */
export async function getS3FileById(id, transaction) {
  try {
    const result = await model.s3FileModel.findByPk(id, { transaction });
    return result;
  } catch (error) {
    console.error("Error in getS3FileById repository:", error);
    throw error;
  }
}

/**
 * Retrieves an S3 file record by S3 key.
 * @param {string} s3Key - S3 key
 * @param {Object} [transaction] - Sequelize transaction
 */
export async function getS3FileByKey(s3Key, transaction) {
  try {
    const result = await model.s3FileModel.findOne({
      where: { s3Key },
      transaction,
    });
    return result;
  } catch (error) {
    console.error("Error in getS3FileByKey repository:", error);
    throw error;
  }
}

/**
 * Updates an S3 file record.
 * @param {string} id - The UUID of the S3 file
 * @param {Object} data - Data to update
 * @param {Object} [transaction] - Sequelize transaction
 */
export async function updateS3File(id, data, transaction) {
  try {
    return await model.s3FileModel.update(data, {
      where: { id },
      transaction,
    });
  } catch (error) {
    console.error("Error in updateS3File repository:", error);
    throw error;
  }
}

/**
 * Retrieves all S3 file records.
 * @param {Object} [query] - Sequelize query options
 */
export async function getAllS3Files(query = {}) {
  try {
    const result = await model.s3FileModel.findAll(query);
    return result;
  } catch (error) {
    console.error("Error in getAllS3Files repository:", error);
    throw error;
  }
}
