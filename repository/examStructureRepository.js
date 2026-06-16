import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addExamStructure(examDetail) {
  try {
    const result = await scoped(model.examStructureModel).create(examDetail);
    return result;
  } catch (error) {
    console.error("Error adding exam Structure:", error);
    throw error;
  }
};

export async function getExamStructure(acedmicYearId) {
  try {
    const result = await scoped(model.examStructureModel).findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
      },
      where: {
        ...(acedmicYearId && { acedmicYearId }),
      },
      include: [
        {
          model: model.courseModel.unscoped(),
          as: "courseExam",
          exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
        },
        {
          model: model.sessionModel.unscoped(),
          as: "sessionExam",
          exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
        },
      ],
    });
    return result;
  } catch (error) {
    console.error("Error fetching exam Structures:", error);
    throw error;
  }
};

export async function getSingleExamStructure(courseId, sessionId) {
  try {
    const result = await scoped(model.examStructureModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: { courseId, sessionId },
      include: [
        {
          model: model.courseModel.unscoped(),
          as: "courseExam",
          exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
        },
        {
          model: model.sessionModel.unscoped(),
          as: "sessionExam",
          exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching exam Structure:", error);
    throw error;
  }
};

export async function deleteExamStructure(examStructureId) {
  try {
    const existing = await scoped(model.examStructureModel).findOne({
      where: { examStructureId },
      attributes: ['examStructureId'],
    });
    if (!existing) {
      return false;
    }
    const deleted = await scoped(model.examStructureModel).destroy({ where: { examStructureId } });
    return deleted > 0;
  } catch (error) {
    console.error("Error deleting exam Structure:", error);
    throw error;
  }
};

export async function updateExamStructure(examStructureId, examDetail) {
  try {
    const existing = await scoped(model.examStructureModel).findOne({
      where: { examStructureId },
      attributes: ['examStructureId'],
    });
    if (!existing) {
      return [0];
    }
    const result = await scoped(model.examStructureModel).update(examDetail, {
      where: { examStructureId },
    });
    return result;
  } catch (error) {
    console.error("Error updating exam Structure:", error);
    throw error;
  }
};

export async function addExamType(examDetail) {
  try {
    const result = await scoped(model.examSetupTypeModel).create(examDetail);
    return result;
  } catch (error) {
    console.error("Error adding exam Structure setup type:", error);
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
          model: model.examStructureModel.unscoped(),
          as: "examStructure",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          where: buildScope(model.examStructureModel),
          required: false,
          include: [
            {
              model: model.courseModel.unscoped(),
              as: "courseExam",
              attributes: ["courseId", "courseName", "capacity"],
            },
            {
              model: model.sessionModel.unscoped(),
              as: "sessionExam",
              attributes: ["sessionId", "sessionName"],
            },
            {
              model: model.acedmicYearModel.unscoped(),
              as: "acedmicExam",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
          ],
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching exam structure details:", error.message);
    throw error;
  }
};

export async function getSingleExamType(courseId, sessionId, termNumber) {
  try {
    const structureWhere = {
      courseId,
      sessionId,
      ...buildScope(model.examStructureModel),
    };

    const termInclude = {
      model: model.examSetupTypeTermModel.unscoped(),
      as: "examSetupTypeTerms",
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: {
        ...(termNumber != null && { term: termNumber, courseId }),
      },
      required: termNumber != null,
    };

    return await scoped(model.examSetupTypeModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.examStructureModel.unscoped(),
          as: "examStructure",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          where: structureWhere,
          required: true,
          include: [
            {
              model: model.courseModel.unscoped(),
              as: "courseExam",
              attributes: ["courseId", "courseName", "capacity"],
            },
            {
              model: model.sessionModel.unscoped(),
              as: "sessionExam",
              attributes: ["sessionId", "sessionName"],
            },
            {
              model: model.acedmicYearModel.unscoped(),
              as: "acedmicExam",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
          ],
        },
        termInclude,
      ],
      subQuery: false,
      distinct: true,
    });
  } catch (error) {
    console.error("Error fetching exam structure details:", error.message);
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
