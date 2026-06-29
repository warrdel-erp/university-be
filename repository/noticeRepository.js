import { literal, Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function addNotice(data, transaction) {
  try {
    return scoped(model.noticeModel).create(data, { transaction });
  } catch (error) {
    console.error("Error in add notice :", error);
    throw error;
  }
}

export async function getAllStudentNotice() {
  try {
    return scoped(model.noticeModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: {
        [Op.and]: [literal(`JSON_CONTAINS(message_to, '"Student"')`)],
      },
    });
  } catch (error) {
    console.error("Error fetching student notices:", error);
    throw error;
  }
}

export async function getAllEmployeeNotice(createdBy, role) {
  try {
    const noticeCreated = await scoped(model.noticeModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: {
        ...(createdBy && { createdBy }),
      },
    });

    const noticeAll = await scoped(model.noticeModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: {
        [Op.and]: [literal(`JSON_CONTAINS(message_to, '["${role}"]')`)],
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

    return scoped(model.noticeModel).update(data, { where: { noticeId } });
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
