import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function resolveAcademicYearId(explicit) {
  if (explicit != null && explicit !== "") {
    return Number(explicit);
  }
  return buildScope(model.examSetupTypeModel).academicYearId;
}

export async function addExamType(examDetail) {
  try {
    const result = await scoped(model.examSetupTypeModel).create(examDetail);
    return result;
  } catch (error) {
    console.error("Error adding exam setup type:", error);
    throw error;
  }
};

export async function getDetailByExamType(examSetupTypeId) {
  try {
    const result = await scoped(model.examSetupTypeModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: { examSetupTypeId },
      include: [
        {
          model: model.courseModel,
          as: "course",
          attributes: ["courseId", "courseName"],
          required: false,
        },
        {
          model: model.sessionModel,
          as: "session",
          attributes: ["sessionId", "sessionName"],
          required: false,
        },
        {
          model: model.examSetupTypeTermModel,
          as: "examSetupTypeTerms",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          required: false,
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching exam type details:", error.message);
    throw error;
  }
};

export async function getSingleExamType(courseId, sessionId, academicYearId, termNumber) {
  try {
    const yearId = resolveAcademicYearId(academicYearId);
    const where = {};
    if (courseId) where.courseId = Number(courseId);
    if (sessionId) where.sessionId = Number(sessionId);

    const termWhere = {};
    if (yearId) termWhere.academicYearId = yearId;
    if (courseId) termWhere.courseId = Number(courseId);
    if (termNumber != null) termWhere.term = Number(termNumber);

    const termInclude = {
      model: model.examSetupTypeTermModel,
      as: "examSetupTypeTerms",
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: termWhere,
      required: termNumber != null,
      include: [
        {
          model: model.examScheduleModel,
          as: "examSchedules",
          attributes: ["examScheduleId", "subjectId", "examDate", "examTime"],
          where: { sessionId },
          required: false,
        },
      ],
    };

    return await scoped(model.examSetupTypeModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where,
      include: [
        {
          model: model.courseModel,
          as: "course",
          attributes: ["courseId", "courseName"],
          required: false,
        },
        {
          model: model.sessionModel,
          as: "session",
          attributes: ["sessionId", "sessionName"],
          required: false,
        },
        termInclude,
      ],
      subQuery: false,
      distinct: true,
    });
  } catch (error) {
    console.error("Error fetching exam type details:", error.message);
    throw error;
  }
};

export async function deleteExamType(examSetupTypeId) {
  try {
    const existing = await scoped(model.examSetupTypeModel).findOne({
      where: { examSetupTypeId },
      attributes: ['examSetupTypeId'],
    });
    if (!existing) {
      return false;
    }
    const deleted = await scoped(model.examSetupTypeModel).destroy({ where: { examSetupTypeId } });
    return deleted > 0;
  } catch (error) {
    console.error("Error deleting exam type:", error);
    throw error;
  }
};

export async function updateExamType(examSetupTypeId, examDetail) {
  try {
    const existing = await scoped(model.examSetupTypeModel).findOne({
      where: { examSetupTypeId },
      attributes: ['examSetupTypeId'],
    });
    if (!existing) {
      return [0];
    }
    const result = await scoped(model.examSetupTypeModel).update(examDetail, {
      where: { examSetupTypeId },
    });
    return result;
  } catch (error) {
    console.error("Error updating exam type:", error);
    throw error;
  }
};
