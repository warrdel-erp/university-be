import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { getAllocatedCapacityByExamScheduleIds } from "../utility/roomCapacity.js";
import {
  getStudentCountMapByGroups,
  lookupStudentCount,
} from "../utility/studentCount.js";
import { QUESTION_STATUS } from "../constant.js";

const sessionInclude = [
  {
    model: model.acedmicYearModel,
    as: "academicYear",
    attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
    required: false,
  },
  {
    model: model.examSetupTypeModel,
    as: "assessmentType",
    attributes: ["examSetupTypeId", "examName", "examCode", "examCategory", "managedBy"],
    required: false,
  },
  {
    model: model.examinationSessionTermModel,
    as: "examinationSessionTerms",
    attributes: [
      "examinationSessionTermId",
      "examinationSessionId",
      "courseId",
      "sessionId",
      "term",
      "includeElectives",
      "remarks",
    ],
    required: false,
  },
];

export async function findExaminationSessionByAssessmentTypeId(assessmentTypeId, options = {}) {
  return scoped(model.examinationSessionModel).findOne({
    where: { assessmentTypeId: Number(assessmentTypeId) },
    transaction: options.transaction,
  });
}

export async function findExaminationSessionByAssessmentTypeIdExcludingId(assessmentTypeId, examinationSessionId, options = {}) {
  return scoped(model.examinationSessionModel).findOne({
    where: {
      assessmentTypeId: Number(assessmentTypeId),
      examinationSessionId: { [Op.ne]: Number(examinationSessionId) },
    },
    transaction: options.transaction,
  });
}

export async function createExaminationSession(sessionData, options = {}) {
  return scoped(model.examinationSessionModel).create(sessionData, options);
}

async function findExaminationSessionIdsByLifecycleStatus(
  lifecycleStatus,
  options = {},
) {
  if (lifecycleStatus === "running") {
    const rows = await scoped(model.examScheduleModel).findAll({
      attributes: ["examinationSessionId"],
      group: ["examinationSessionId"],
      raw: true,
      transaction: options.transaction,
    });
    const ids = [];
    for (const row of rows) {
      ids.push(Number(row.examinationSessionId));
    }
    return ids;
  }

  if (lifecycleStatus === "schedulingEvaluation") {
    const rows = await scoped(model.examScheduleModel).findAll({
      attributes: ["examinationSessionId"],
      include: [
        {
          model: model.answerSheetQrModel,
          as: "answerSheetQrs",
          attributes: [],
          required: true,
          where: buildScope(model.answerSheetQrModel),
        },
      ],
      group: ["examinationSessionId"],
      raw: true,
      transaction: options.transaction,
    });
    const ids = [];
    for (const row of rows) {
      ids.push(Number(row.examinationSessionId));
    }
    return ids;
  }

  if (lifecycleStatus === "result") {
    const rows = await scoped(model.studentResultModel).findAll({
      attributes: ["examinationSessionId"],
      group: ["examinationSessionId"],
      raw: true,
      transaction: options.transaction,
    });
    const ids = [];
    for (const row of rows) {
      ids.push(Number(row.examinationSessionId));
    }
    return ids;
  }

  return null;
}

export async function findAndCountExaminationSessions(
  { where, limit, offset, lifecycleStatus },
  options = {},
) {
  const sessionWhere = { ...where };

  if (lifecycleStatus) {
    const sessionIds = await findExaminationSessionIdsByLifecycleStatus(
      lifecycleStatus,
      options,
    );
    if (!sessionIds.length) {
      return { count: 0, rows: [] };
    }
    sessionWhere.examinationSessionId = { [Op.in]: sessionIds };
  }

  return scoped(model.examinationSessionModel).findAndCountAll({
    where: sessionWhere,
    include: sessionInclude,
    distinct: true,
    order: [["examinationSessionId", "DESC"]],
    limit,
    offset,
    transaction: options.transaction,
  });
}

export async function getExaminationSessionById(id, options = {}) {
  return scoped(model.examinationSessionModel).findOne({
    where: { examinationSessionId: Number(id) },
    include: sessionInclude,
    transaction: options.transaction,
  });
}

export async function findExaminationSessionAssessmentTypeById(id, options = {}) {
  return scoped(model.examinationSessionModel).findOne({
    where: { examinationSessionId: Number(id) },
    attributes: ["assessmentTypeId", "status", "academicYearId"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function updateExaminationSession(id, updateData, options = {}) {
  return scoped(model.examinationSessionModel).update(updateData, {
    where: { examinationSessionId: Number(id) },
    transaction: options.transaction,
  });
}

export async function deleteExaminationSession(id, options = {}) {
  return scoped(model.examinationSessionModel).destroy({
    where: { examinationSessionId: Number(id) },
    transaction: options.transaction,
  });
}

export async function findClassSectionTermsByIds(classSectionTermIds, options = {}) {
  return model.classSectionTermModel.findAll({
    where: { classSectionTermId: { [Op.in]: classSectionTermIds } },
    attributes: ["classSectionTermId", "classSectionsId", "term"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function findClassSectionTermsByIdsWithSection(
  classSectionTermIds,
  options = {},
) {
  if (!classSectionTermIds.length) return [];
  return model.classSectionTermModel.findAll({
    where: { classSectionTermId: { [Op.in]: classSectionTermIds } },
    attributes: ["classSectionTermId", "classSectionsId", "term"],
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        required: true,
        attributes: ["classSectionsId", "courseId", "sessionId", "academicYearId", "section"],
      },
    ],
    transaction: options.transaction,
  });
}

export async function findClassSectionTerms(where, options = {}) {
  return model.classSectionTermModel.findAll({
    where,
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    raw: true,
    transaction: options.transaction,
  });
}

export async function createExaminationSessionTerms(termData, options = {}) {
  if (!termData.length) return [];
  return scoped(model.examinationSessionTermModel).bulkCreate(termData, {
    transaction: options.transaction,
  });
}

export async function createExaminationSessionTerm(termData, options = {}) {
  return scoped(model.examinationSessionTermModel).create(termData, options);
}

export async function deleteExaminationSessionTermsBySessionId(examinationSessionId, options = {}) {
  return scoped(model.examinationSessionTermModel).destroy({
    where: { examinationSessionId: Number(examinationSessionId) },
    transaction: options.transaction,
  });
}

export async function deleteExaminationSessionTermsByTerms(
  examinationSessionId,
  terms,
  options = {},
) {
  if (!terms.length) return 0;
  return scoped(model.examinationSessionTermModel).destroy({
    where: {
      examinationSessionId: Number(examinationSessionId),
      term: { [Op.in]: terms },
    },
    transaction: options.transaction,
  });
}

export async function findExaminationSessionTermById(examinationSessionTermId, options = {}) {
  return scoped(model.examinationSessionTermModel).findOne({
    where: { examinationSessionTermId: Number(examinationSessionTermId) },
    attributes: [
      "examinationSessionTermId",
      "examinationSessionId",
      "courseId",
      "sessionId",
      "term",
      "includeElectives",
      "remarks",
    ],
    transaction: options.transaction,
  });
}

/** True when any exam schedule exists for this session + term number. */
export async function hasExamSchedulesForTerm(
  examinationSessionId,
  term,
  options = {},
) {
  const count = await scoped(model.examScheduleModel).count({
    where: {
      examinationSessionId: Number(examinationSessionId),
      term: Number(term),
    },
    transaction: options.transaction,
  });
  return count > 0;
}

/** Distinct courseIds that have class sections for the given term numbers in an academic year. */
export async function findDistinctCourseIdsByTerms(
  terms,
  academicYearId,
  options = {},
) {
  if (!terms.length || !academicYearId) return [];
  const rows = await model.classSectionTermModel.findAll({
    attributes: ["classSectionTermId"],
    where: { term: { [Op.in]: terms } },
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        required: true,
        attributes: ["courseId"],
        where: { academicYearId: Number(academicYearId) },
      },
    ],
    transaction: options.transaction,
  });
  const courseIdSet = new Set();
  for (const row of rows) {
    courseIdSet.add(Number(row.classSection.courseId));
  }
  return [...courseIdSet];
}

export async function deleteExaminationSessionTerm(examinationSessionTermId, options = {}) {
  return model.examinationSessionTermModel.destroy({
    where: { examinationSessionTermId: Number(examinationSessionTermId) },
    transaction: options.transaction,
  });
}

export async function findAssessmentPlanComponentsBySetupTypeId(examSetupTypeId, options = {}) {
  return scoped(model.assessmentPlanComponentModel).findAll({
    where: { examSetupTypeId: Number(examSetupTypeId) },
    attributes: ["assessmentPlanId"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function findAssessmentPlanComponentDurationBySetupTypeId(examSetupTypeId, options = {}) {
  return scoped(model.assessmentPlanComponentModel).findOne({
    where: { examSetupTypeId: Number(examSetupTypeId) },
    attributes: ["duration", "weightagePercentage"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function findAssessmentPlanSubjectMappings(where, options = {}) {
  return scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where,
    attributes: ["subjectId", "courseId", "sessionId", "academicYearId", "assessmentPlanId"],
    raw: true,
    transaction: options.transaction,
  });
}

/**
 * Curriculum subjects for courseId + term across every admission batch.
 * Path: curriculum → curriculum_batch_mapping → curriculum_subject_term_mapping
 */
export async function findCurriculumSubjectsByCourseAndTerm(
  courseId,
  term,
  options = {},
) {
  return model.curriculumSubjectTermMappingModel.findAll({
    attributes: [
      "curriculumSubjectTermMappingId",
      "curriculumId",
      "subjectId",
      "term",
    ],
    where: { term: Number(term) },
    include: [
      {
        model: model.curriculumModel,
        as: "curriculum",
        attributes: ["curriculumId", "name", "courseId"],
        required: true,
        where: {
          ...buildScope(model.curriculumModel),
          courseId: Number(courseId),
        },
        include: [
          {
            model: model.curriculumBatchMappingModel,
            as: "batchMappings",
            attributes: ["curriculumBatchMappingId", "batch"],
            required: true,
          },
        ],
      },
      {
        model: model.subjectModel,
        as: "subject",
        attributes: ["subjectId", "subjectName", "subjectCode"],
        required: true,
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Mapped subjectIds for courseId + sessionId that belong to curriculum term.
 */
export async function findMappedSubjectIdsForCourseSessionTerm(
  { courseId, sessionId, term, subjectIds },
  options = {},
) {
  if (!subjectIds.length) {
    return [];
  }

  const rows = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: {
      courseId: Number(courseId),
      sessionId: Number(sessionId),
      subjectId: { [Op.in]: subjectIds },
    },
    attributes: ["subjectId", "courseId", "sessionId"],
    include: [
      {
        model: model.subjectModel,
        as: "subject",
        attributes: ["subjectId"],
        required: true,
        include: [
          {
            model: model.curriculumSubjectTermMappingModel,
            as: "curriculumTermMappings",
            attributes: ["curriculumSubjectTermMappingId", "term"],
            required: true,
            where: { term: Number(term) },
            include: [
              {
                model: model.curriculumModel,
                as: "curriculum",
                attributes: ["curriculumId", "courseId"],
                required: true,
                where: {
                  ...buildScope(model.curriculumModel),
                  courseId: Number(courseId),
                },
              },
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  const mappedIds = [];
  const seen = new Set();
  for (const row of rows) {
    const subjectId = Number(row.subjectId);
    if (seen.has(subjectId)) continue;
    seen.add(subjectId);
    mappedIds.push(subjectId);
  }
  return mappedIds;
}

export async function findAssessmentPlanSubjectMappingsWithSession(where, options = {}) {
  return scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where,
    attributes: ["subjectId", "courseId", "sessionId"],
    include: [
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
    ],
    raw: true,
    transaction: options.transaction,
  });
}

export async function findSubjects(where, options = {}) {
  return scoped(model.subjectModel).findAll({
    where,
    attributes: ["subjectId", "subjectName", "subjectCode", "subjectType", "subjectCategory", "courseId", "term", "academicYearId"],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["termType"],
      }
    ],
    raw: true,
    nest: true,
    transaction: options.transaction,
  });
}

export async function findExamSchedulesBySubjects(examinationSessionId, subjectIds, options = {}) {
  if (!subjectIds || subjectIds.length === 0) return [];
  const whereClause = {
    examinationSessionId: Number(examinationSessionId),
    subjectId: { [Op.in]: subjectIds }
  };
  if (options.date) {
    whereClause.examDate = options.date;
  }
  return scoped(model.examScheduleModel).findAll({
    where: whereClause,
    attributes: [
      "examScheduleId",
      "subjectId",
      "sessionId",
      "academicYearId",
      "examDate",
      "examTime",
      "type",
      "duration",
      "maximumMarks",
      "examinationSessionSlotId",
      "term",
      "published",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["courseId"],
      },
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: ["slotNumber", "startTime", "endTime", "durationMinutes"],
      }
    ],
    order: [["examScheduleId", "DESC"]],
    transaction: options.transaction,
  });
}

/** Sum allocated capacity per examScheduleId (DB-level GROUP BY). */
export async function findRoomCapacitiesByExamSchedules(examScheduleIds, options = {}) {
  return getAllocatedCapacityByExamScheduleIds(examScheduleIds, options);
}

export async function findTeacherAssignmentsByExamSchedules(examScheduleIds, options = {}) {
  if (!examScheduleIds.length) return [];
  return scoped(model.teacherExamAssignmentModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: ["teacherExamAssignmentId", "examScheduleId", "createdAt", "deadline"],
    include: [
      {
        model: model.employeeModel,
        as: "teacherEmployee",
        attributes: ["employeeId", "userId", "employeeCode"],
        required: true,
        include: [
          {
            model: model.userModel,
            as: "user",
            attributes: ["userId", "userName", "email", "phone"],
          }
        ]
      }
    ],
    transaction: options.transaction,
  });
}

export async function findQuestionPapersByExamSchedules(examScheduleIds, options = {}) {
  if (!examScheduleIds.length) return [];
  return scoped(model.questionPaperModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: ["id", "examScheduleId", "createdBy", "updatedBy", "status", "finalApproval", "createdAt", "updatedAt"],
    include: [
      {
        model: model.userModel,
        as: "updater",
        attributes: ["userId", "userName"],
        required: false,
      }
    ],
    transaction: options.transaction,
    raw: true,
    nest: true,
  });
}

export async function findCoursesByIds(courseIds, options = {}) {
  return scoped(model.courseModel).findAll({
    where: { courseId: { [Op.in]: courseIds } },
    attributes: ["courseId", "courseName", "courseCode", "courseDuration", "termType", "totalTerms"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function findSessionsByIds(sessionIds, options = {}) {
  return scoped(model.sessionModel).findAll({
    where: { sessionId: { [Op.in]: sessionIds } },
    attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function findClassSections(where, options = {}) {
  return scoped(model.classSectionModel).findAll({
    where,
    attributes: ["classSectionsId", "courseId"],
    raw: true,
    transaction: options.transaction,
  });
}

export async function countStudentClassSectionHistory(where, options = {}) {
  return model.studentClassSectionsHistoryModel.count({
    where,
    transaction: options.transaction,
  });
}

export async function findExaminationSessionSlots(examinationSessionId, options = {}) {
  return scoped(model.examinationSessionSlotModel).findAll({
    where: { examinationSessionId: Number(examinationSessionId) },
    attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime", "durationMinutes"],
    order: [["slotNumber", "ASC"]],
    transaction: options.transaction,
    raw: true,
  });
}

export async function findExamSchedulesBySlotIds(slotIds, options = {}) {
  return scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionSlotId: { [Op.in]: slotIds },
    },
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["subjectId", "subjectName", "subjectCode"],
      },
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime", "durationMinutes"],
      },
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacities",
        include: [
          {
            model: model.classRoomModel,
            as: "classRoom",
            attributes: ["classRoomSectionId", "roomNumber"],
          },
        ],
      },
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["courseId"],
      },
    ],
    order: [
      ["examDate", "ASC"],
      [{ model: model.examinationSessionSlotModel, as: "examinationSessionSlot" }, "slotNumber", "ASC"],
      ["examTime", "ASC"],
    ],
    transaction: options.transaction,
  });
}

export async function findOverlapTermForAssessmentType(assessmentTypeId, terms, options = {}) {
  return scoped(model.examinationSessionTermModel).findOne({
    where: {
      term: { [Op.in]: terms },
    },
    include: [
      {
        model: model.examinationSessionModel,
        as: "examinationSession",
        where: { assessmentTypeId: Number(assessmentTypeId) },
        required: true,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findOverlapTermForAssessmentTypeExcludingSession(assessmentTypeId, sessionId, terms, options = {}) {
  return scoped(model.examinationSessionTermModel).findOne({
    where: {
      term: { [Op.in]: terms },
    },
    include: [
      {
        model: model.examinationSessionModel,
        as: "examinationSession",
        where: {
          assessmentTypeId: Number(assessmentTypeId),
          examinationSessionId: { [Op.ne]: Number(sessionId) },
        },
        required: true,
      },
    ],
    transaction: options.transaction,
  });
}

export async function findExaminationSessionTerms(examinationSessionId, options = {}) {
  return scoped(model.examinationSessionTermModel).findAll({
    where: { examinationSessionId: Number(examinationSessionId) },
    attributes: [
      "examinationSessionTermId",
      "examinationSessionId",
      "courseId",
      "sessionId",
      "term",
      "academicYearId",
      "includeElectives",
      "remarks",
    ],
    transaction: options.transaction,
  });
}

export async function findExaminationSessionTermsBySessionIds(
  examinationSessionIds,
  options = {},
) {
  if (!examinationSessionIds.length) return [];
  return scoped(model.examinationSessionTermModel).findAll({
    where: { examinationSessionId: { [Op.in]: examinationSessionIds } },
    attributes: [
      "examinationSessionTermId",
      "examinationSessionId",
      "courseId",
      "sessionId",
      "term",
      "academicYearId",
      "includeElectives",
      "remarks",
    ],
    transaction: options.transaction,
  });
}

/**
 * Assumption: dashboard metrics only include exam_schedule rows that match
 * examination_session_term (courseId + sessionId + term). Used by SKU count APIs only.
 */
function buildExamScheduleTermScopeOr(
  terms,
  { includeExaminationSessionId = false } = {},
) {
  const orConditions = [];
  for (const termRow of terms) {
    const clause = {
      term: Number(termRow.term),
    };
    if (includeExaminationSessionId && termRow.examinationSessionId != null) {
      clause.examinationSessionId = Number(termRow.examinationSessionId);
    }
    if (termRow.sessionId != null) {
      clause.sessionId = Number(termRow.sessionId);
    }
    if (termRow.courseId != null) {
      clause["$subjectSchedule.course_id$"] = Number(termRow.courseId);
    }
    orConditions.push(clause);
  }
  return orConditions;
}

export async function findSchedulesForSkuStats(examinationSessionId, options = {}) {
  const terms = await findExaminationSessionTerms(examinationSessionId, options);
  if (!terms.length) return [];

  return scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionId: Number(examinationSessionId),
      [Op.or]: buildExamScheduleTermScopeOr(terms),
    },
    attributes: [
      "examScheduleId",
      "examDate",
      "examinationSessionSlotId",
      "term",
      "sessionId",
      "academicYearId",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        required: true,
        attributes: ["subjectId", "courseId"],
      },
    ],
    subQuery: false,
    transaction: options.transaction,
  });
}

/** All exam schedules for a session, ordered by date then time. */
export async function findExamSchedulesForTimeline(
  examinationSessionId,
  options = {},
) {
  return scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionId: Number(examinationSessionId),
    },
    attributes: [
      "examScheduleId",
      "examDate",
      "examTime",
      "duration",
      "term",
      "sessionId",
      "subjectId",
      "academicYearId",
      "examinationSessionSlotId",
      "published",
      "type",
      "maximumMarks",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        required: false,
        attributes: [
          "subjectId",
          "subjectName",
          "subjectCode",
          "courseId",
          "term",
        ],
      },
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        required: false,
        attributes: [
          "examinationSessionSlotId",
          "slotNumber",
          "startTime",
          "endTime",
          "durationMinutes",
        ],
      },
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacities",
        required: false,
        attributes: [
          "examScheduleRoomCapacityId",
          "capacity",
          "classRoomSectionId",
          "status",
        ],
        include: [
          {
            model: model.classRoomModel,
            as: "classRoom",
            required: false,
            attributes: ["classRoomSectionId", "roomNumber"],
          },
        ],
      },
    ],
    order: [
      ["examDate", "ASC"],
      ["examTime", "ASC"],
      ["examScheduleId", "ASC"],
    ],
    transaction: options.transaction,
  });
}

export async function publishExamSchedulesByIds(examScheduleIds, userId, options = {}) {
  if (!examScheduleIds.length) return 0;
  const [affected] = await scoped(model.examScheduleModel).update(
    { published: true, updatedBy: userId },
    {
      where: { examScheduleId: { [Op.in]: examScheduleIds } },
      transaction: options.transaction,
    },
  );
  return affected;
}

export async function findQuestionPapersCountForSchedules(examScheduleIds, options = {}) {
  if (!examScheduleIds.length) return { total: 0, approved: 0 };

  const whereBase = { examScheduleId: { [Op.in]: examScheduleIds } };
  const [total, approved] = await Promise.all([
    scoped(model.questionPaperModel).count({
      where: whereBase,
      transaction: options.transaction,
    }),
    scoped(model.questionPaperModel).count({
      where: {
        ...whereBase,
        [Op.or]: [
          { finalApproval: QUESTION_STATUS.APPROVED },
          { status: QUESTION_STATUS.APPROVED },
        ],
      },
      transaction: options.transaction,
    }),
  ]);

  return { total, approved };
}

export async function countHallTicketsBySession(examinationSessionId, options = {}) {
  const where = { examinationSessionId: Number(examinationSessionId) };
  if (options.publishedOnly === true) {
    where.isPublished = true;
  }
  return scoped(model.studentHallTicketModel).count({
    where,
    transaction: options.transaction,
  });
}

export async function countBundlesByDatesAndSlots(uniqueDates, uniqueSlotIds, options = {}) {
  if (!uniqueDates.length || !uniqueSlotIds.length) {
    return { total: 0, received: 0 };
  }

  const baseWhere = {
    examDate: { [Op.in]: uniqueDates },
    examinationSessionSlotId: { [Op.in]: uniqueSlotIds },
  };

  const [total, received] = await Promise.all([
    scoped(model.examRoomMaterialBundleModel).count({
      where: baseWhere,
      transaction: options.transaction,
    }),
    scoped(model.examRoomMaterialBundleModel).count({
      where: { ...baseWhere, status: "RECEIVED" },
      transaction: options.transaction,
    }),
  ]);

  return { total, received };
}

/**
 * Invigilator coverage for session schedules.
 * total    = distinct room + date + slot from exam_schedule_room_capacity
 * assigned = those units with at least one invigilator assignment
 */
export async function countInvigilatorStatsForSchedules(examScheduleIds, options = {}) {
  if (!examScheduleIds.length) {
    return { total: 0, assigned: 0 };
  }

  const roomRows = await scoped(model.examScheduleRoomCapacityModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: ["classRoomSectionId"],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        attributes: ["examDate", "examinationSessionSlotId"],
        where: buildScope(model.examScheduleModel),
      },
    ],
    transaction: options.transaction,
  });

  const roomUnitKeys = new Set();
  const dates = [];
  const slotIds = [];
  const roomIds = [];
  const dateSeen = new Set();
  const slotSeen = new Set();
  const roomSeen = new Set();

  for (const row of roomRows) {
    const examDate = row.examSchedule.examDate;
    const examinationSessionSlotId = row.examSchedule.examinationSessionSlotId;
    const classRoomSectionId = row.classRoomSectionId;
    const key = `${examDate}|${examinationSessionSlotId}|${classRoomSectionId}`;

    if (!roomUnitKeys.has(key)) {
      roomUnitKeys.add(key);
    }
    if (!dateSeen.has(examDate)) {
      dateSeen.add(examDate);
      dates.push(examDate);
    }
    if (!slotSeen.has(examinationSessionSlotId)) {
      slotSeen.add(examinationSessionSlotId);
      slotIds.push(examinationSessionSlotId);
    }
    if (!roomSeen.has(classRoomSectionId)) {
      roomSeen.add(classRoomSectionId);
      roomIds.push(classRoomSectionId);
    }
  }

  if (roomUnitKeys.size === 0) {
    return { total: 0, assigned: 0 };
  }

  const assignmentRows = await scoped(model.examInvigilatorAssignmentModel).findAll({
    where: {
      examDate: { [Op.in]: dates },
      examinationSessionSlotId: { [Op.in]: slotIds },
      classRoomSectionId: { [Op.in]: roomIds },
    },
    attributes: ["examDate", "examinationSessionSlotId", "classRoomSectionId"],
    transaction: options.transaction,
  });

  const assignedKeys = new Set();
  for (const row of assignmentRows) {
    const key = `${row.examDate}|${row.examinationSessionSlotId}|${row.classRoomSectionId}`;
    if (roomUnitKeys.has(key)) {
      assignedKeys.add(key);
    }
  }

  return {
    total: roomUnitKeys.size,
    assigned: assignedKeys.size,
  };
}

/**
 * Answer sheets mapped to a student for schedules in this examination session.
 * total   = studentId IS NOT NULL
 * scanned = those with fileUploadId (s3 file) set
 * submit  = those with markingStatus submit
 */
export async function countAnswerSheetScanStatsBySession(
  examinationSessionId,
  options = {},
) {
  const examScheduleInclude = {
    model: model.examScheduleModel,
    as: "examSchedule",
    required: true,
    attributes: [],
    where: {
      examinationSessionId: Number(examinationSessionId),
      ...buildScope(model.examScheduleModel),
    },
  };

  const mappedWhere = {
    studentId: { [Op.ne]: null },
    examScheduleId: { [Op.ne]: null },
  };

  const [total, scanned, submit] = await Promise.all([
    scoped(model.answerSheetQrModel).count({
      where: mappedWhere,
      include: [examScheduleInclude],
      distinct: true,
      col: "id",
      transaction: options.transaction,
    }),
    scoped(model.answerSheetQrModel).count({
      where: {
        ...mappedWhere,
        fileUploadId: { [Op.ne]: null },
      },
      include: [examScheduleInclude],
      distinct: true,
      col: "id",
      transaction: options.transaction,
    }),
    scoped(model.answerSheetQrModel).count({
      where: {
        ...mappedWhere,
        markingStatus: "submit",
      },
      include: [examScheduleInclude],
      distinct: true,
      col: "id",
      transaction: options.transaction,
    }),
  ]);

  return {
    total: Number(total) || 0,
    scanned: Number(scanned) || 0,
    submit: Number(submit) || 0,
  };
}

export async function countSeatsByExamScheduleIds(examScheduleIds, options = {}) {
  if (!examScheduleIds.length) return new Map();

  const rows = await model.studentExamSeatModel.findAll({
    attributes: [
      [col("roomCapacity.exam_schedule_id"), "examScheduleId"],
      [fn("COUNT", col("student_exam_seat_id")), "seatCount"],
    ],
    include: [
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacity",
        required: true,
        attributes: [],
        where: { examScheduleId: { [Op.in]: examScheduleIds } },
      },
    ],
    group: ["roomCapacity.exam_schedule_id"],
    raw: true,
    transaction: options.transaction,
  });

  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.examScheduleId), Number(row.seatCount) || 0);
  }
  return map;
}

export async function countAttendanceByExamScheduleIds(
  examScheduleIds,
  options = {},
) {
  if (!examScheduleIds.length) return new Map();

  const rows = await scoped(model.examAttendanceModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: [
      "examScheduleId",
      "attendanceStatus",
      [fn("COUNT", col("exam_attendance_id")), "count"],
    ],
    group: ["examScheduleId", "attendanceStatus"],
    raw: true,
    transaction: options.transaction,
  });

  const map = new Map();
  for (const scheduleId of examScheduleIds) {
    map.set(Number(scheduleId), { present: 0, absent: 0, pending: 0, total: 0 });
  }

  for (const row of rows) {
    const scheduleId = Number(row.examScheduleId);
    const entry = map.get(scheduleId);
    const count = Number(row.count) || 0;
    entry.total += count;
    if (row.attendanceStatus === "PRESENT") {
      entry.present += count;
    } else if (row.attendanceStatus === "ABSENT") {
      entry.absent += count;
    } else {
      entry.pending += count;
    }
  }

  return map;
}

export async function countAnswerSheetStatsByExamScheduleIds(
  examScheduleIds,
  options = {},
) {
  if (!examScheduleIds.length) return new Map();

  const [studentRows, scannedRows, markedRows] = await Promise.all([
    scoped(model.answerSheetQrModel).findAll({
      where: {
        examScheduleId: { [Op.in]: examScheduleIds },
        studentId: { [Op.ne]: null },
      },
      attributes: ["examScheduleId", [fn("COUNT", col("id")), "count"]],
      group: ["examScheduleId"],
      raw: true,
      transaction: options.transaction,
    }),
    scoped(model.answerSheetQrModel).findAll({
      where: {
        examScheduleId: { [Op.in]: examScheduleIds },
        studentId: { [Op.ne]: null },
        fileUploadId: { [Op.ne]: null },
      },
      attributes: ["examScheduleId", [fn("COUNT", col("id")), "count"]],
      group: ["examScheduleId"],
      raw: true,
      transaction: options.transaction,
    }),
    scoped(model.answerSheetQrModel).findAll({
      where: {
        examScheduleId: { [Op.in]: examScheduleIds },
        studentId: { [Op.ne]: null },
        [Op.or]: [
          { markingStatus: "submit" },
          { evaluatedAt: { [Op.ne]: null } },
        ],
      },
      attributes: ["examScheduleId", [fn("COUNT", col("id")), "count"]],
      group: ["examScheduleId"],
      raw: true,
      transaction: options.transaction,
    }),
  ]);

  const map = new Map();
  for (const scheduleId of examScheduleIds) {
    map.set(Number(scheduleId), {
      students: 0,
      scanned: 0,
      marked: 0,
    });
  }

  for (const row of studentRows) {
    map.get(Number(row.examScheduleId)).students = Number(row.count) || 0;
  }
  for (const row of scannedRows) {
    map.get(Number(row.examScheduleId)).scanned = Number(row.count) || 0;
  }
  for (const row of markedRows) {
    map.get(Number(row.examScheduleId)).marked = Number(row.count) || 0;
  }

  return map;
}

const BUNDLE_READY_OR_LATER = [
  "READY",
  "ISSUED",
  "RECEIVED",
  "VERIFIED",
  "CLOSED",
];

/**
 * Per examSchedule: room count vs bundles at READY or later
 * (matched by examDate + slot + classRoomSectionId).
 */
export async function countRoomBundleReadyByExamScheduleIds(
  examScheduleIds,
  options = {},
) {
  if (!examScheduleIds.length) return new Map();

  const roomRows = await scoped(model.examScheduleRoomCapacityModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: ["examScheduleId", "classRoomSectionId"],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        attributes: ["examDate", "examinationSessionSlotId"],
        where: buildScope(model.examScheduleModel),
      },
    ],
    transaction: options.transaction,
  });

  const map = new Map();
  for (const scheduleId of examScheduleIds) {
    map.set(Number(scheduleId), {
      rooms: 0,
      bundlesReady: 0,
      invigilatorsAssigned: 0,
      roomKeys: [],
    });
  }

  const dates = [];
  const slotIds = [];
  const roomIds = [];
  const dateSeen = new Set();
  const slotSeen = new Set();
  const roomSeen = new Set();

  for (const row of roomRows) {
    const scheduleId = Number(row.examScheduleId);
    const entry = map.get(scheduleId);
    if (!entry) {
      continue;
    }

    const examDate = row.examSchedule.examDate;
    const examinationSessionSlotId = row.examSchedule.examinationSessionSlotId;
    const classRoomSectionId = row.classRoomSectionId;
    const key = `${examDate}|${examinationSessionSlotId}|${classRoomSectionId}`;

    entry.rooms += 1;
    entry.roomKeys.push(key);

    if (!dateSeen.has(examDate)) {
      dateSeen.add(examDate);
      dates.push(examDate);
    }
    if (!slotSeen.has(examinationSessionSlotId)) {
      slotSeen.add(examinationSessionSlotId);
      slotIds.push(examinationSessionSlotId);
    }
    if (!roomSeen.has(classRoomSectionId)) {
      roomSeen.add(classRoomSectionId);
      roomIds.push(classRoomSectionId);
    }
  }

  if (!dates.length || !slotIds.length || !roomIds.length) {
    for (const [, entry] of map) {
      delete entry.roomKeys;
    }
    return map;
  }

  const [bundles, assignments] = await Promise.all([
    scoped(model.examRoomMaterialBundleModel).findAll({
      where: {
        examDate: { [Op.in]: dates },
        examinationSessionSlotId: { [Op.in]: slotIds },
        classRoomSectionId: { [Op.in]: roomIds },
        status: { [Op.in]: BUNDLE_READY_OR_LATER },
      },
      attributes: [
        "examDate",
        "examinationSessionSlotId",
        "classRoomSectionId",
      ],
      transaction: options.transaction,
    }),
    scoped(model.examInvigilatorAssignmentModel).findAll({
      where: {
        examDate: { [Op.in]: dates },
        examinationSessionSlotId: { [Op.in]: slotIds },
        classRoomSectionId: { [Op.in]: roomIds },
      },
      attributes: [
        "examDate",
        "examinationSessionSlotId",
        "classRoomSectionId",
      ],
      transaction: options.transaction,
    }),
  ]);

  const readyKeys = new Set();
  for (const bundle of bundles) {
    readyKeys.add(
      `${bundle.examDate}|${bundle.examinationSessionSlotId}|${bundle.classRoomSectionId}`,
    );
  }

  const assignedKeys = new Set();
  for (const assignment of assignments) {
    assignedKeys.add(
      `${assignment.examDate}|${assignment.examinationSessionSlotId}|${assignment.classRoomSectionId}`,
    );
  }

  for (const [, entry] of map) {
    let bundlesReady = 0;
    let invigilatorsAssigned = 0;
    for (const key of entry.roomKeys) {
      if (readyKeys.has(key)) {
        bundlesReady += 1;
      }
      if (assignedKeys.has(key)) {
        invigilatorsAssigned += 1;
      }
    }
    entry.bundlesReady = bundlesReady;
    entry.invigilatorsAssigned = invigilatorsAssigned;
    delete entry.roomKeys;
  }

  return map;
}

export async function countHallTicketStatsBySession(
  examinationSessionId,
  options = {},
) {
  const where = { examinationSessionId: Number(examinationSessionId) };
  const [total, published] = await Promise.all([
    scoped(model.studentHallTicketModel).count({
      where,
      transaction: options.transaction,
    }),
    scoped(model.studentHallTicketModel).count({
      where: { ...where, isPublished: true },
      transaction: options.transaction,
    }),
  ]);

  return {
    total: Number(total) || 0,
    published: Number(published) || 0,
  };
}

/**
 * Students for exam schedules (student.sessionId in schedule sessionIds)
 * and hall tickets generated for this examination session for those students.
 */
export async function countStudentsAndHallTicketsForScheduleSessionIds(
  examinationSessionId,
  sessionIds,
  options = {},
) {
  const uniqueSessionIds = [];
  const seen = new Set();
  for (const sessionId of sessionIds || []) {
    const id = Number(sessionId);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    uniqueSessionIds.push(id);
  }

  if (!uniqueSessionIds.length) {
    return { students: 0, hallTicketsGenerated: 0, hallTicketsPublished: 0 };
  }

  const studentWhere = { sessionId: { [Op.in]: uniqueSessionIds } };

  const [students, hallTicketsGenerated, hallTicketsPublished] =
    await Promise.all([
      scoped(model.studentModel).count({
        where: studentWhere,
        distinct: true,
        col: "student_id",
        transaction: options.transaction,
      }),
      scoped(model.studentHallTicketModel).count({
        where: { examinationSessionId: Number(examinationSessionId) },
        include: [
          {
            model: model.studentModel,
            as: "student",
            required: true,
            attributes: [],
            where: {
              ...studentWhere,
              ...buildScope(model.studentModel),
            },
          },
        ],
        distinct: true,
        col: "id",
        transaction: options.transaction,
      }),
      scoped(model.studentHallTicketModel).count({
        where: {
          examinationSessionId: Number(examinationSessionId),
          isPublished: true,
        },
        include: [
          {
            model: model.studentModel,
            as: "student",
            required: true,
            attributes: [],
            where: {
              ...studentWhere,
              ...buildScope(model.studentModel),
            },
          },
        ],
        distinct: true,
        col: "id",
        transaction: options.transaction,
      }),
    ]);

  return {
    students: Number(students) || 0,
    hallTicketsGenerated: Number(hallTicketsGenerated) || 0,
    hallTicketsPublished: Number(hallTicketsPublished) || 0,
  };
}

/**
 * Per examSchedule: seated students vs hall tickets generated and published results.
 */
export async function countHallTicketCoverageByExamScheduleIds(
  examinationSessionId,
  examScheduleIds,
  options = {},
) {
  const map = new Map();
  for (const scheduleId of examScheduleIds) {
    map.set(Number(scheduleId), {
      students: 0,
      generated: 0,
      resultsPublished: 0,
    });
  }

  if (!examScheduleIds.length) {
    return map;
  }

  const [tickets, results, seats] = await Promise.all([
    scoped(model.studentHallTicketModel).findAll({
      where: { examinationSessionId: Number(examinationSessionId) },
      attributes: ["studentId"],
      raw: true,
      transaction: options.transaction,
    }),
    scoped(model.studentResultModel).findAll({
      where: {
        examinationSessionId: Number(examinationSessionId),
        publishedAt: { [Op.ne]: null },
      },
      attributes: ["studentId"],
      raw: true,
      transaction: options.transaction,
    }),
    model.studentExamSeatModel.findAll({
      attributes: ["studentId"],
      include: [
        {
          model: model.examScheduleRoomCapacityModel,
          as: "roomCapacity",
          required: true,
          attributes: ["examScheduleId"],
          where: { examScheduleId: { [Op.in]: examScheduleIds } },
        },
      ],
      transaction: options.transaction,
    }),
  ]);

  const ticketStudentIds = new Set();
  for (const ticket of tickets) {
    ticketStudentIds.add(Number(ticket.studentId));
  }

  const resultStudentIds = new Set();
  for (const result of results) {
    resultStudentIds.add(Number(result.studentId));
  }

  for (const seat of seats) {
    const scheduleId = Number(seat.roomCapacity.examScheduleId);
    const entry = map.get(scheduleId);
    if (!entry) {
      continue;
    }
    const studentId = Number(seat.studentId);
    entry.students += 1;
    if (ticketStudentIds.has(studentId)) {
      entry.generated += 1;
    }
    if (resultStudentIds.has(studentId)) {
      entry.resultsPublished += 1;
    }
  }

  return map;
}

export async function countStudentResultStatsBySession(
  examinationSessionId,
  options = {},
) {
  const where = { examinationSessionId: Number(examinationSessionId) };
  const [total, published] = await Promise.all([
    scoped(model.studentResultModel).count({
      where,
      transaction: options.transaction,
    }),
    scoped(model.studentResultModel).count({
      where: { ...where, publishedAt: { [Op.ne]: null } },
      transaction: options.transaction,
    }),
  ]);

  return {
    total: Number(total) || 0,
    published: Number(published) || 0,
  };
}

export async function countBundleStatusStatsByDatesAndSlots(
  uniqueDates,
  uniqueSlotIds,
  options = {},
) {
  if (!uniqueDates.length || !uniqueSlotIds.length) {
    return {
      total: 0,
      received: 0,
      verified: 0,
      issued: 0,
      preparing: 0,
    };
  }

  const baseWhere = {
    examDate: { [Op.in]: uniqueDates },
    examinationSessionSlotId: { [Op.in]: uniqueSlotIds },
  };

  const [total, received, verified, issued, preparing] = await Promise.all([
    scoped(model.examRoomMaterialBundleModel).count({
      where: baseWhere,
      transaction: options.transaction,
    }),
    scoped(model.examRoomMaterialBundleModel).count({
      where: {
        ...baseWhere,
        status: { [Op.in]: ["RECEIVED", "VERIFIED", "CLOSED"] },
      },
      transaction: options.transaction,
    }),
    scoped(model.examRoomMaterialBundleModel).count({
      where: { ...baseWhere, status: { [Op.in]: ["VERIFIED", "CLOSED"] } },
      transaction: options.transaction,
    }),
    scoped(model.examRoomMaterialBundleModel).count({
      where: {
        ...baseWhere,
        status: { [Op.in]: ["ISSUED", "RECEIVED", "VERIFIED", "CLOSED"] },
      },
      transaction: options.transaction,
    }),
    scoped(model.examRoomMaterialBundleModel).count({
      where: { ...baseWhere, status: { [Op.in]: ["PREPARING", "READY"] } },
      transaction: options.transaction,
    }),
  ]);

  return {
    total: Number(total) || 0,
    received: Number(received) || 0,
    verified: Number(verified) || 0,
    issued: Number(issued) || 0,
    preparing: Number(preparing) || 0,
  };
}

export async function countTodayPublishedSchedules(
  examinationSessionId,
  examDate,
  options = {},
) {
  return scoped(model.examScheduleModel).count({
    where: {
      examinationSessionId: Number(examinationSessionId),
      published: true,
      examDate,
    },
    transaction: options.transaction,
  });
}

export async function countPublishedSchedulesBySession(
  examinationSessionId,
  options = {},
) {
  return scoped(model.examScheduleModel).count({
    where: {
      examinationSessionId: Number(examinationSessionId),
      published: true,
    },
    transaction: options.transaction,
  });
}

export async function findSessionCourseMappingsByCoursesAndSessions(courseIds, sessionIds, options = {}) {
  return scoped(model.sessionCouseMappingModel).findAll({
    where: {
      courseId: { [Op.in]: courseIds },
      sessionId: { [Op.in]: sessionIds }
    },
    attributes: ["sessionCourseMappingId", "courseId", "sessionId"],
    include: [
      {
        model: model.courseModel,
        as: "courses",
        attributes: ["courseName"],
      },
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionName"],
      }
    ],
    transaction: options.transaction,
  });
}

export async function findSessionCourseMappingsByIds(sessionCourseMappingIds, options = {}) {
  return scoped(model.sessionCouseMappingModel).findAll({
    where: {
      sessionCourseMappingId: { [Op.in]: sessionCourseMappingIds }
    },
    attributes: ["sessionCourseMappingId", "courseId", "sessionId"],
    transaction: options.transaction,
    raw: true,
  });
}

