import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import { Op } from "sequelize";

import { findRoomsByExamScheduleIds } from "./examStructureScheduleMappingRepository.js";

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

export async function findSlotsByExaminationSessionId(
  examinationSessionId,
  options = {},
) {
  return scoped(model.examinationSessionSlotModel).findAll({
    where: {
      examinationSessionId: Number(examinationSessionId),
    },
    order: [["slotNumber", "ASC"]],
    raw: true,
    transaction: options.transaction,
  });
}

function buildScheduleWhere({ slotIds, date, filterCombinations }) {
  const scheduleWhere = {
    examinationSessionSlotId: {
      [Op.in]: slotIds,
    },
  };

  if (date) {
    scheduleWhere.examDate = date;
  }

  if (filterCombinations.length > 0) {
    const orSchedules = [];
    for (const comb of filterCombinations) {
      orSchedules.push({
        sessionId: comb.sessionId,
        "$subjectSchedule.course_id$": comb.courseId,
        "$subjectSchedule.term$": { [Op.in]: comb.terms },
      });
    }
    scheduleWhere[Op.or] = orSchedules;
  }

  return scheduleWhere;
}

export async function findExamSchedulesForSlots(
  { slotIds, date, filterCombinations },
  options = {},
) {
  if (!slotIds.length) {
    return [];
  }

  return scoped(model.examScheduleModel).findAll({
    where: buildScheduleWhere({ slotIds, date, filterCombinations }),
    attributes: [
      "examScheduleId",
      "examinationSessionSlotId",
      "subjectId",
      "sessionId",
      "academicYearId",
      "term",
      "examDate",
      "examTime",
      "type",
      "duration",
      "maximumMarks",
      "published",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        required: true,
        attributes: [
          "subjectId",
          "subjectName",
          "subjectCode",
          "courseId",
          "term",
          "academicYearId",
        ],
        include: [
          {
            model: model.courseModel,
            as: "courseInfo",
            attributes: ["courseName", "termType"],
          },
        ],
      },
    ],
    order: [
      ["examDate", "ASC"],
      ["examTime", "ASC"],
    ],
    transaction: options.transaction,
  });
}

export async function findExamSchedulesForSlotsCount(
  { slotIds, date, filterCombinations },
  options = {},
) {
  if (!slotIds.length) {
    return [];
  }

  return scoped(model.examScheduleModel).findAll({
    where: buildScheduleWhere({ slotIds, date, filterCombinations }),
    attributes: [
      "examScheduleId",
      "sessionId",
      "academicYearId",
      "term",
      "published",
      "subjectId",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        required: true,
        attributes: ["subjectId", "courseId", "term", "academicYearId"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findRoomsForExamSchedules(examScheduleIds, options = {}) {
  return findRoomsByExamScheduleIds(examScheduleIds, options);
}

export async function getExaminationSessionSlotById(
  examinationSessionSlotId,
  options = {},
) {
  return await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });
}

export async function updateExaminationSessionSlot(
  examinationSessionSlotId,
  updateData,
  options = {},
) {
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

export async function deleteExaminationSessionSlot(
  examinationSessionSlotId,
  options = {},
) {
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
