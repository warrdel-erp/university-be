import { Op, col, where, fn } from "sequelize";
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

/**
 * Count active students for a given batchId and term.
 * 1. Find classSections related to batchId
 * 2. Find classSectionTerms filtered by term
 * 3. Count distinct students in those classSectionTermIds
 */
export async function countStudentsByBatchIdAndTerm(batchId, term, options = {}) {
  if (!batchId || !term) return 0;

  // 1. Get classSections related to batchId
  const classSections = await scoped(model.classSectionModel).findAll({
    where: { batchId: Number(batchId) },
    attributes: ["classSectionsId"],
    raw: true,
    transaction: options.transaction,
  });

  const classSectionIds = classSections
    .map((cs) => Number(cs.classSectionsId))
    .filter(Boolean);

  if (!classSectionIds.length) {
    return 0;
  }

  // 2. Filter classSectionTerm by term
  const classSectionTerms = await scoped(model.classSectionTermModel).findAll({
    where: {
      classSectionsId: { [Op.in]: classSectionIds },
      term: Number(term),
    },
    attributes: ["classSectionTermId"],
    raw: true,
    transaction: options.transaction,
  });

  const classSectionTermIds = classSectionTerms
    .map((cst) => Number(cst.classSectionTermId))
    .filter(Boolean);

  if (!classSectionTermIds.length) {
    return 0;
  }

  // 3. Count students in those classSectionTermIds for this batchId
  return scoped(model.studentModel).count({
    distinct: true,
    col: "student_id",
    where: {
      classSectionTermId: { [Op.in]: classSectionTermIds },
      batchId: Number(batchId),
    },
    transaction: options.transaction,
  });
}

/**
 * Get student counts for multiple batchId + term pairs.
 * 1. Find classSections related to batchIds
 * 2. Find classSectionTerms filtered by classSectionsId and term
 * 3. Count distinct students in those classSectionTermIds
 * @param {Array<{batchId: number, term: number}>} pairs
 * @returns {Promise<Map<string, number>>} Map with key `${batchId}_${term}` -> studentCount
 */
export async function countStudentsByBatchAndTermPairs(pairs, options = {}) {
  const countMap = new Map();
  if (!pairs || !pairs.length) return countMap;

  const validPairs = pairs.filter(
    (p) => p && p.batchId != null && p.term != null,
  );
  if (!validPairs.length) return countMap;

  const uniquePairs = [];
  const seenPairKeys = new Set();
  for (const p of validPairs) {
    const key = `${Number(p.batchId)}_${Number(p.term)}`;
    if (!seenPairKeys.has(key)) {
      seenPairKeys.add(key);
      uniquePairs.push({ batchId: Number(p.batchId), term: Number(p.term) });
    }
  }

  const batchIds = [...new Set(uniquePairs.map((p) => p.batchId))];
  const terms = [...new Set(uniquePairs.map((p) => p.term))];

  // 1. Get classSections related to batchIds
  const classSections = await scoped(model.classSectionModel).findAll({
    where: { batchId: { [Op.in]: batchIds } },
    attributes: ["classSectionsId", "batchId"],
    raw: true,
    transaction: options.transaction,
  });

  const sectionIdToBatchId = new Map();
  for (const cs of classSections) {
    sectionIdToBatchId.set(Number(cs.classSectionsId), Number(cs.batchId));
  }
  const classSectionIds = Array.from(sectionIdToBatchId.keys());
  if (!classSectionIds.length) {
    for (const p of uniquePairs) {
      countMap.set(`${p.batchId}_${p.term}`, 0);
    }
    return countMap;
  }

  // 2. Filter classSectionTerm by term
  const classSectionTerms = await scoped(model.classSectionTermModel).findAll({
    where: {
      classSectionsId: { [Op.in]: classSectionIds },
      term: { [Op.in]: terms },
    },
    attributes: ["classSectionTermId", "classSectionsId", "term"],
    raw: true,
    transaction: options.transaction,
  });

  const pairToCstIds = new Map();
  const allCstIds = [];
  for (const row of classSectionTerms) {
    const bId = sectionIdToBatchId.get(Number(row.classSectionsId));
    const t = Number(row.term);
    const key = `${bId}_${t}`;
    if (!pairToCstIds.has(key)) {
      pairToCstIds.set(key, []);
    }
    pairToCstIds.get(key).push(Number(row.classSectionTermId));
    allCstIds.push(Number(row.classSectionTermId));
  }

  if (!allCstIds.length) {
    for (const p of uniquePairs) {
      countMap.set(`${p.batchId}_${p.term}`, 0);
    }
    return countMap;
  }

  // 3. Count distinct students in those classSectionTermIds
  const studentRows = await scoped(model.studentModel).findAll({
    attributes: [
      "classSectionTermId",
      [fn("COUNT", fn("DISTINCT", col("students.student_id"))), "studentCount"],
    ],
    where: {
      classSectionTermId: { [Op.in]: allCstIds },
      batchId: { [Op.in]: batchIds },
    },
    group: ["students.class_section_term_id"],
    raw: true,
    transaction: options.transaction,
  });

  const cstCounts = new Map();
  for (const row of studentRows) {
    cstCounts.set(Number(row.classSectionTermId), Number(row.studentCount) || 0);
  }

  for (const p of uniquePairs) {
    const key = `${p.batchId}_${p.term}`;
    const cstIds = pairToCstIds.get(key) || [];
    let count = 0;
    for (const id of cstIds) {
      count += cstCounts.get(id) || 0;
    }
    countMap.set(key, count);
  }

  return countMap;
}
