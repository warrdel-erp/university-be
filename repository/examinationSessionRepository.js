import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import { getAllocatedCapacityByExamScheduleIds } from "../utility/roomCapacity.js";
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
    attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
    required: false,
  },
  {
    model: model.examinationSessionTermModel,
    as: "examinationSessionTerms",
    attributes: [
      "examinationSessionTermId",
      "examinationSessionId",
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

export async function findAndCountExaminationSessions({ where, limit, offset }, options = {}) {
  return scoped(model.examinationSessionModel).findAndCountAll({
    where,
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
    attributes: ["assessmentTypeId", "status"],
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
      "term",
      "includeElectives",
      "remarks",
    ],
    transaction: options.transaction,
  });
}

export async function findSchedulesForSkuStats(examinationSessionId, options = {}) {
  return scoped(model.examScheduleModel).findAll({
    where: { examinationSessionId: Number(examinationSessionId) },
    attributes: [
      "examScheduleId",
      "examDate",
      "examTime",
      "examinationSessionSlotId",
      "subjectId",
      "term",
      "sessionId",
      "academicYearId",
    ],
    transaction: options.transaction,
    raw: true,
  });
}

/** Up to `limit` exam schedules for a given date (today's timeline). */
export async function findExamSchedulesForTimeline(
  examinationSessionId,
  examDate,
  limit = 5,
  options = {},
) {
  return scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionId: Number(examinationSessionId),
      examDate,
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
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        required: true,
        attributes: ["subjectId", "subjectName", "subjectCode", "courseId", "term"],
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
        attributes: ["examScheduleRoomCapacityId", "capacity", "classRoomSectionId"],
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
      ["examTime", "ASC"],
      ["examScheduleId", "ASC"],
    ],
    limit: Number(limit),
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

