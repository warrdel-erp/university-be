import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createExaminationSessionSlot(slotData, options = {}) {
  return await scoped(model.examinationSessionSlotModel).create(slotData, {
    transaction: options.transaction,
  });
}

export async function getExaminationSessionSlots(examinationSessionId, options = {}) {
  return await scoped(model.examinationSessionSlotModel).findAll({
    where: { examinationSessionId: Number(examinationSessionId) },
    order: [["slotNumber", "ASC"]],
    transaction: options.transaction,
  });
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
