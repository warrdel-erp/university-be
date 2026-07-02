import { literal, Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { ROLES } from "../const/roles.js";

const excludeMeta = ["createdAt", "updatedAt", "deletedAt"];

const stripTenantFields = (data = {}) => {
  const {
    noticeId,
    instituteId,
    universityId,
    academicYearId,
    campusId,
    ...rest
  } = data;
  return rest;
};

export async function addNotice(data, transaction) {
  try {
    return scoped(model.noticeModel).create(stripTenantFields(data), { transaction });
  } catch (error) {
    console.error("Error in add notice :", error);
    throw error;
  }
}

function messageToContains(target) {
  return literal(`JSON_CONTAINS(message_to, '"${target}"')`);
}

function buildInstituteUniversityScope() {
  return buildScope(model.noticeModel, { scopeConfig: { academicYear: false } });
}

function buildStudentNoticeWhere(role) {
  const isTeacher = String(role ?? "").toUpperCase() === ROLES.TEACHER;

  const targets = isTeacher
    ? [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT]
    : [ROLES.STUDENT, "Student"];

  return {
    [Op.or]: targets.map((target) => messageToContains(target)),
  };
}

export async function getAllStudentNotice(role) {
  try {
    const tenantWhere = buildInstituteUniversityScope();

    return model.noticeModel.findAll({
      attributes: { exclude: excludeMeta },
      where: {
        [Op.and]: [buildStudentNoticeWhere(role), tenantWhere],
      },
      order: [["noticeId", "DESC"]],
    });
  } catch (error) {
    console.error("Error fetching student notices:", error);
    throw error;
  }
}

export async function getAllEmployeeNotice(createdBy, role) {
  try {
    const noticeCreated = await scoped(model.noticeModel).findAll({
      attributes: { exclude: excludeMeta },
      where: {
        ...(createdBy && { createdBy }),
      },
    });

    const noticeAll = await scoped(model.noticeModel).findAll({
      attributes: { exclude: excludeMeta },
      where: {
        [Op.and]: [messageToContains(role || ROLES.TEACHER)],
      },
    });

    return { noticeCreated, noticeAll };
  } catch (error) {
    console.error("Error fetching employee notices:", error);
    throw error;
  }
}

export async function updateNotice(noticeId, data) {
  try {
    const existing = await scoped(model.noticeModel).findOne({
      attributes: ["noticeId"],
      where: { noticeId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.noticeModel).update(stripTenantFields(data), { where: { noticeId } });
  } catch (error) {
    console.error(`Error updating Notice creation ${noticeId}:`, error);
    throw error;
  }
}

export async function deleteNotice(noticeId) {
  const existing = await scoped(model.noticeModel).findOne({
    attributes: ["noticeId"],
    where: { noticeId },
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.noticeModel).destroy({ where: { noticeId } });
  return deleted > 0;
}
