import { Op, col, where } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const scheduleInclude = (date, filterCombinations, examinationSessionId) => {
  const scheduleWhere = {};
  if (examinationSessionId) {
    scheduleWhere.examinationSessionId = Number(examinationSessionId);
  }
  if (date) {
    scheduleWhere.examDate = date;
  }
  if (filterCombinations && filterCombinations.length > 0) {
    const orSchedules = [];
    for (const comb of filterCombinations) {
      const andClauses = [];
      if (comb.batchId) {
        andClauses.push({ batchId: comb.batchId });
      }
      if (comb.terms && comb.terms.length > 0) {
        andClauses.push({ term: { [Op.in]: comb.terms } });
      }
      if (comb.courseId) {
        andClauses.push(where(col("examSchedules->subjectSchedule.course_id"), comb.courseId));
      }
      if (andClauses.length > 0) {
        orSchedules.push({ [Op.and]: andClauses });
      }
    }
    if (orSchedules.length > 0) {
      scheduleWhere[Op.or] = orSchedules;
    }
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
      "batchId",
      "curriculumSubjectTermMappingId",
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
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch", "sessionId", "status"],
        required: false,
        include: [
          {
            model: model.sessionModel,
            as: "session",
            attributes: ["sessionId", "sessionName"],
            required: false,
          },
        ],
      },
      {
        model: model.curriculumSubjectTermMappingModel,
        as: "curriculumSubjectTermMapping",
        attributes: [
          "curriculumSubjectTermMappingId",
          "curriculumId",
          "term",
          "subjectId",
        ],
        required: false,
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
    include: [scheduleInclude(date, filterCombinations, examinationSessionId)],
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

const slotAttributes = [
  "examinationSessionSlotId",
  "examinationSessionId",
  "universityId",
  "instituteId",
  "slotNumber",
  "startTime",
  "endTime",
  "durationMinutes",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
];

export async function getExaminationSessionSlotById(
  params,
  options = {},
) {
  let examinationSessionId;
  let examinationSessionSlotId;

  if (typeof params === "number" || typeof params === "string") {
    examinationSessionSlotId = Number(params);
  } else {
    examinationSessionId = params.examinationSessionId;
    examinationSessionSlotId = params.examinationSessionSlotId;
  }

  const where = {};
  if (examinationSessionId != null) {
    where.examinationSessionId = Number(examinationSessionId);
  }
  if (examinationSessionSlotId != null) {
    where.examinationSessionSlotId = Number(examinationSessionSlotId);
  }

  if (examinationSessionSlotId != null) {
    return scoped(model.examinationSessionSlotModel).findOne({
      where,
      attributes: slotAttributes,
      transaction: options.transaction,
    });
  }

  if (examinationSessionId == null) {
    return null;
  }

  return scoped(model.examinationSessionSlotModel).findAll({
    where,
    attributes: slotAttributes,
    order: [["slotNumber", "ASC"]],
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

  const assignedScheduleCount = await scoped(model.examScheduleModel).count({
    where: { examinationSessionSlotId: Number(examinationSessionSlotId) },
    transaction: options.transaction,
  });
  if (assignedScheduleCount > 0) {
    const error = new Error(
      "Cannot delete examination session slot because exam schedules are assigned to it.",
    );
    error.statusCode = 400;
    throw error;
  }

  return slot.destroy({ transaction: options.transaction });
}
