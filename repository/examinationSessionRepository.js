import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

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
    include: [
      {
        model: model.classSectionTermModel,
        as: "classSectionTerm",
        attributes: ["classSectionTermId", "classSectionsId", "term"],
        required: false,
      },
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
    attributes: ["assessmentTypeId"],
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

export async function findClassSectionTerms(where, options = {}) {
  return model.classSectionTermModel.findAll({
    where,
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    raw: true,
    transaction: options.transaction,
  });
}

export async function createExaminationSessionTerms(termData, options = {}) {
  return model.examinationSessionTermModel.bulkCreate(termData, {
    transaction: options.transaction,
  });
}

export async function createExaminationSessionTerm(termData, options = {}) {
  return model.examinationSessionTermModel.create(termData, options);
}

export async function deleteExaminationSessionTermsBySessionId(examinationSessionId, options = {}) {
  return model.examinationSessionTermModel.destroy({
    where: { examinationSessionId: Number(examinationSessionId) },
    transaction: options.transaction,
  });
}

export async function findExaminationSessionTermById(examinationSessionTermId, options = {}) {
  return model.examinationSessionTermModel.findOne({
    where: { examinationSessionTermId: Number(examinationSessionTermId) },
    transaction: options.transaction,
  });
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
    raw: true,
    transaction: options.transaction,
  });
}

export async function findExamSchedulesBySubjects(examinationSessionId, subjectIds, options = {}) {
  if (!subjectIds || subjectIds.length === 0) return [];
  return scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionId: Number(examinationSessionId),
      subjectId: { [Op.in]: subjectIds }
    },
    attributes: ["examScheduleId", "subjectId", "sessionId", "academicYearId", "examDate", "examTime", "type", "duration", "examinationSessionSlotId"],
    include: [
      {
        model: model.examSetupTypeTermModel,
        as: "examSetupTypeTerm",
        attributes: ["courseId", "term"],
      },
    ],
    order: [["examScheduleId", "DESC"]],
    transaction: options.transaction,
  });
}

export async function findRoomCapacitiesByExamSchedules(examScheduleIds, options = {}) {
  if (!examScheduleIds.length) return [];
  return scoped(model.examScheduleRoomCapacityModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: ["examScheduleId", "capacity"],
    transaction: options.transaction,
    raw: true,
  });
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
        model: model.examSetupTypeTermModel,
        as: "examSetupTypeTerm",
        attributes: ["courseId", "term"],
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
