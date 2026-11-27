import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const noticeListAttributes = [
  "noticeId",
  "instituteId",
  "campusId",
  "universityId",
  "academicYearId",
  "title",
  "notice",
  "noticeDate",
  "publishDate",
  "createdBy",
  "updatedBy",
];

const stripWriteFields = (data = {}) => {
  const {
    noticeId,
    instituteId,
    universityId,
    academicYearId,
    campusId,
    messageTo,
    role,
    departmentId,
    ...rest
  } = data;
  return rest;
};

export async function addNotice(data, options = {}) {
  const transaction = options?.transaction !== undefined ? options.transaction : (options?.commit ? options : undefined);
  try {
    return scoped(model.noticeModel).create(stripWriteFields(data), { transaction });
  } catch (error) {
    console.error("Error in add notice :", error);
    throw error;
  }
}

/** All notices for current tenant (university + institute). */
export async function getAllNotices(academicYearId) {
  try {
    const scopeOptions = { scopeConfig: { academicYear: false } };
    const where = {};
    if (academicYearId != null && academicYearId !== "") {
      where.academicYearId = Number(academicYearId);
    }

    return scoped(model.noticeModel, scopeOptions).findAll({
      attributes: noticeListAttributes,
      where,
      order: [["noticeId", "DESC"]],
    });
  } catch (error) {
    console.error("Error fetching notices:", error);
    throw error;
  }
}

export async function updateNotice(noticeId, data, options = {}) {
  try {
    const existing = await scoped(model.noticeModel).findOne({
      attributes: ["noticeId"],
      where: { noticeId },
      transaction: options.transaction,
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.noticeModel).update(stripWriteFields(data), {
      where: { noticeId },
      transaction: options.transaction,
      individualHooks: true,
    });
  } catch (error) {
    console.error(`Error updating Notice creation ${noticeId}:`, error);
    throw error;
  }
}

export async function deleteNotice(noticeId, options = {}) {
  const existing = await scoped(model.noticeModel).findOne({
    attributes: ["noticeId"],
    where: { noticeId },
    transaction: options.transaction,
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.noticeModel).destroy({
    where: { noticeId },
    transaction: options.transaction,
    individualHooks: true,
  });
  return deleted > 0;
}
