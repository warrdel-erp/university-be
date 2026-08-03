import { Op } from "sequelize";
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
          required: false,
        },
      ],
    };

    const queryOptions = {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where,
      include: [termInclude],
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
