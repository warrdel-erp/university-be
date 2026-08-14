import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function resolveAcademicYearId(explicit) {
  if (explicit != null && explicit !== "") {
    return Number(explicit);
  }
  return buildScope(model.examSetupTypeModel).academicYearId;
}

export async function addExamType(examDetail, options = {}) {
  try {
    const result = await scoped(model.examSetupTypeModel).create(examDetail, options);
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

    });

    return result;
  } catch (error) {
    console.error("Error fetching exam type details:", error.message);
    throw error;
  }
};

export async function getAllExamTypes(academicYearId, termNumber, options = {}) {
  try {
    const yearId = resolveAcademicYearId(academicYearId);
    const where = {};

    if (options.search) {
      where[Op.or] = [
        { examName: { [Op.like]: `%${options.search}%` } },
        { examCode: { [Op.like]: `%${options.search}%` } },
        { examCategory: { [Op.like]: `%${options.search}%` } },
        { examSubcategory: { [Op.like]: `%${options.search}%` } },
      ];
    }

    const termWhere = {};
    if (yearId) termWhere.academicYearId = yearId;
    if (termNumber != null) termWhere.term = Number(termNumber);

    const queryOptions = {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where,
      subQuery: false,
      distinct: true,
    };

    if (options.page && options.limit) {
      const page = Math.max(1, parseInt(options.page, 10));
      const limit = Math.max(1, parseInt(options.limit, 10));
      queryOptions.offset = (page - 1) * limit;
      queryOptions.limit = limit;

      const { count, rows } = await scoped(model.examSetupTypeModel).findAndCountAll(queryOptions);
      return {
        rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 1,
      };
    }

    const rows = await scoped(model.examSetupTypeModel).findAll(queryOptions);
    return {
      rows,
      total: rows.length,
      page: 1,
      limit: rows.length || 10,
      totalPages: 1,
    };
  } catch (error) {
    console.error("Error fetching exam type details:", error.message);
    throw error;
  }
};

export async function deleteExamType(examSetupTypeId, options = {}) {
  try {
    const existing = await scoped(model.examSetupTypeModel).findOne({
      where: { examSetupTypeId },
      attributes: ['examSetupTypeId'],
      ...options,
    });
    if (!existing) {
      return false;
    }

    const inUse = await scoped(model.assessmentPlanComponentModel).findOne({
      where: { examSetupTypeId: Number(examSetupTypeId) },
      attributes: ['assessmentPlanComponentId'],
      ...options,
    });

    if (inUse) {
      const error = new Error("Cannot delete exam type as it is currently in use in an assessment plan.");
      error.statusCode = 400;
      throw error;
    }

    const deleted = await scoped(model.examSetupTypeModel).destroy({
      where: { examSetupTypeId },
      ...options,
    });
    return deleted > 0;
  } catch (error) {
    console.error("Error deleting exam type:", error);
    throw error;
  }
};

export async function updateExamType(examSetupTypeId, examDetail, options = {}) {
  try {
    const existing = await scoped(model.examSetupTypeModel).findOne({
      where: { examSetupTypeId },
      attributes: ['examSetupTypeId'],
      ...options,
    });
    if (!existing) {
      return [0];
    }
    const result = await scoped(model.examSetupTypeModel).update(examDetail, {
      where: { examSetupTypeId },
      ...options,
    });
    return result;
  } catch (error) {
    console.error("Error updating exam type:", error);
    throw error;
  }
};
