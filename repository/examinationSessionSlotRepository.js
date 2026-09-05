import { Op, col, where } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const scheduleInclude = (date, filterCombinations) => {
  const scheduleWhere = {};
  if (date) {
    scheduleWhere.examDate = date;
  }
  if (filterCombinations && filterCombinations.length > 0) {
    const orSchedules = [];
    for (const comb of filterCombinations) {
      orSchedules.push({
        [Op.and]: [
          { sessionId: comb.sessionId },
          where(col("examSchedules->subjectSchedule.course_id"), comb.courseId),
          where(col("examSchedules->subjectSchedule.term"), {
            [Op.in]: comb.terms,
          }),
        ],
      });
    }
    scheduleWhere[Op.or] = orSchedules;
  }

  return {
    model: model.examScheduleModel,
    as: "examSchedules",
    required: false,
    where:
      Object.keys(scheduleWhere).length > 0 ||
      Object.getOwnPropertySymbols(scheduleWhere).length > 0
        ? scheduleWhere
        : undefined,
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
      "examinationSessionId",
      "createdBy",
      "updatedBy",
      "createdAt",
      "updatedAt",
      "deletedAt",
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
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacities",
        required: false,
        attributes: ["examScheduleId", "capacity"],
        include: [
          {
            model: model.classRoomModel,
            as: "classRoom",
            attributes: ["roomNumber"],
          },
        ],
      },
    ],
  };
};

export async function getMaxSlotNumber(examinationSessionId, options = {}) {
  const highestSlot = await scoped(model.examinationSessionSlotModel).findOne({
    where: { examinationSessionId: Number(examinationSessionId) },
    order: [["slotNumber", "DESC"]],
    attributes: ["slotNumber"],
    transaction: options.transaction,
    paranoid: false,
    raw: true,
  });
  return highestSlot?.slotNumber ? Number(highestSlot.slotNumber) : 0;
}

export async function createExaminationSessionSlot(slotData, options = {}) {
  return scoped(model.examinationSessionSlotModel).create(slotData, {
    transaction: options.transaction,
  });
}

/**
 * Slots with nested examSchedules, subject/course, and room capacities via Sequelize includes.
 */
export async function findSlotsWithSchedules(
  { examinationSessionId, date, filterCombinations },
  options = {},
) {
  return scoped(model.examinationSessionSlotModel).findAll({
    where: { examinationSessionId: Number(examinationSessionId) },
    order: [
      ["slotNumber", "ASC"],
      [
        { model: model.examScheduleModel, as: "examSchedules" },
        "examDate",
        "ASC",
      ],
      [
        { model: model.examScheduleModel, as: "examSchedules" },
        "examTime",
        "ASC",
      ],
    ],
    include: [scheduleInclude(date, filterCombinations)],
    ...options,
  });
}

/** Slot headers only — used when listing needsScheduling without schedule enrichment. */
export async function findSlotsWithoutSchedules(
  { examinationSessionId },
  options = {},
) {
  return scoped(model.examinationSessionSlotModel).findAll({
    where: { examinationSessionId: Number(examinationSessionId) },
    attributes: [
      "examinationSessionSlotId",
      "examinationSessionId",
      "universityId",
      "instituteId",
      "academicYearId",
      "slotNumber",
      "startTime",
      "endTime",
      "durationMinutes",
      "createdBy",
      "updatedBy",
      "createdAt",
      "updatedAt",
    ],
    order: [["slotNumber", "ASC"]],
    transaction: options.transaction,
  });
}

export async function getExaminationSessionSlotById(
  examinationSessionSlotId,
  options = {},
) {
  return scoped(model.examinationSessionSlotModel).findOne({
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
  return slot.update(updateData, { transaction: options.transaction });
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
  return slot.destroy({ transaction: options.transaction });
}
