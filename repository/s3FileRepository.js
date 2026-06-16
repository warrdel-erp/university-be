import * as model from "../models/index.js";
import { requestContext } from "../utility/requestContext.js";
import { scoped } from "../utility/scoped.js";

export async function createS3FileEntry(data, transaction) {
  try {
    return scoped(model.s3FileModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in createS3File repository:", error);
    throw error;
  }
}

export async function getS3FileById(id, transaction) {
  try {
    return scoped(model.s3FileModel).findByPk(id, { transaction });
  } catch (error) {
    console.error("Error in getS3FileById repository:", error);
    throw error;
  }
}

export async function getS3FileByKey(s3Key, transaction) {
  try {
    return scoped(model.s3FileModel).findOne({
      where: { s3Key },
      transaction,
    });
  } catch (error) {
    console.error("Error in getS3FileByKey repository:", error);
    throw error;
  }
}

export async function updateS3File(id, data, transaction) {
  try {
    const existing = await scoped(model.s3FileModel).findByPk(id, { transaction });
    if (!existing) {
      return [0];
    }

    return scoped(model.s3FileModel).update(data, {
      where: { id },
      transaction,
    });
  } catch (error) {
    console.error("Error in updateS3File repository:", error);
    throw error;
  }
}

export async function getAllS3Files(query = {}) {
  try {
    const store = requestContext.getStore();
    const businessWhere = store?.instituteId ? { companyId: store.instituteId } : {};

    return scoped(model.s3FileModel).findAll({
      ...query,
      where: {
        ...query.where,
        ...businessWhere,
      },
    });
  } catch (error) {
    console.error("Error in getAllS3Files repository:", error);
    throw error;
  }
}
