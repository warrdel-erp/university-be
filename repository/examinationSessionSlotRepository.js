import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

export async function getMaxSlotNumber(examinationSessionId, options = {}) {
  const highestSlot = await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionId: Number(examinationSessionId) },
    order: [["slotNumber", "DESC"]],
    attributes: ["slotNumber"],
    transaction: options.transaction,
    paranoid: false,
    raw: true,
  });
  return highestSlot && highestSlot.slotNumber ? Number(highestSlot.slotNumber) : 0;
}

export async function createExaminationSessionSlot(slotData, options = {}) {
  return await scoped(model.examinationSessionSlotModel).create(slotData, {
    transaction: options.transaction,
  });
}

export async function getExaminationSessionSlots(
  examinationSessionId,
  options = {}
) {
  const slots = await scoped(model.examinationSessionSlotModel).findAll({
    where: {
      examinationSessionId: Number(examinationSessionId),
    },
    order: [["slotNumber", "ASC"]],
    raw: true,
    transaction: options.transaction,
  });

  if (!slots.length) {
    return [];
  }

  const slotIds = [];

  for (const slot of slots) {
    slotIds.push(slot.examinationSessionSlotId);
  }

  const schedules = await scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionSlotId: {
        [Op.in]: slotIds,
      },
    },
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["subjectId", "subjectName", "subjectCode"],
      },
    ],
    order: [
      ["examDate", "ASC"],
      ["examTime", "ASC"],
    ],
    transaction: options.transaction,
  });

  const scheduleMap = new Map();

  for (const schedule of schedules) {
    const item = schedule.get({ plain: true });

    if (!scheduleMap.has(item.examinationSessionSlotId)) {
      scheduleMap.set(item.examinationSessionSlotId, []);
    }

    scheduleMap.get(item.examinationSessionSlotId).push(item);
  }

  const result = [];

  for (const slot of slots) {
    result.push({
      ...slot,
      schedules: scheduleMap.get(slot.examinationSessionSlotId) || [],
    });
  }

  return result;
}

export async function getExaminationSessionSlotById(examinationSessionSlotId, options = {}) {
  return await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });
}

export async function updateExaminationSessionSlot(examinationSessionSlotId, updateData, options = {}) {
  const slot = await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });

  if (!slot) {
    const error = new Error("Examination session slot not found");
    error.statusCode = 404;
    throw error;
  }

  return await slot.update(updateData, { transaction: options.transaction });
}

export async function deleteExaminationSessionSlot(examinationSessionSlotId, options = {}) {
  const slot = await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });

  if (!slot) {
    const error = new Error("Examination session slot not found");
    error.statusCode = 404;
    throw error;
  }

  return await slot.destroy({ transaction: options.transaction });
}
