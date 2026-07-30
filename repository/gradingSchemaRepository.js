import { Op } from "sequelize";
import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function findGradingSchemaByCode(gradingCode, universityId, excludeId = null) {
  const where = {
    gradingCode,
    universityId: Number(universityId),
  };
  if (excludeId) {
    where.gradingId = { [Op.ne]: Number(excludeId) };
  }
  return await scoped(model.gradingModel).findOne({ where });
}

export async function createGradingSchema(data, grades = [], options = {}) {
  const newGrading = await scoped(model.gradingModel).create(data, options);

  if (grades && grades.length > 0) {
    const gradesData = grades.map((g) => ({
      ...g,
      gradingId: newGrading.gradingId,
    }));
    await model.gradingGradeModel.bulkCreate(gradesData, options);
  }

  return await getGradingSchemaById(newGrading.gradingId, options);
}

export async function getGradingSchemas({ search, status, gradingMethod, page = 1, limit = 10 }) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (gradingMethod) {
    where.gradingMethod = gradingMethod;
  }
  if (search) {
    where[Op.or] = [
      { gradingName: { [Op.like]: `%${search}%` } },
      { gradingCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await scoped(model.gradingModel).findAndCountAll({
    where,
    include: [
      {
        model: model.gradingGradeModel,
        as: "grades",
        required: false,
      },
    ],
    distinct: true,
    order: [["gradingId", "DESC"]],
    limit: limitNum,
    offset,
  });

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: rows,
  };
}

export async function getGradingSchemaById(gradingSchemaId, options = {}) {
  return await scoped(model.gradingModel).findOne({
    where: { gradingId: Number(gradingSchemaId) },
    include: [
      {
        model: model.gradingGradeModel,
        as: "grades",
        required: false,
      },
    ],
    order: [[{ model: model.gradingGradeModel, as: "grades" }, "sortOrder", "ASC"]],
    transaction: options.transaction,
  });
}

export async function updateGradingSchema(gradingSchemaId, data, grades = null, options = {}) {
  await scoped(model.gradingModel).update(data, {
    where: { gradingId: Number(gradingSchemaId) },
    transaction: options.transaction,
  });

  if (grades !== null && Array.isArray(grades)) {
    await model.gradingGradeModel.destroy({
      where: { gradingId: Number(gradingSchemaId) },
      transaction: options.transaction,
    });

    if (grades.length > 0) {
      const gradesData = grades.map((g) => ({
        ...g,
        gradingId: Number(gradingSchemaId),
      }));
      await model.gradingGradeModel.bulkCreate(gradesData, options);
    }
  }

  return await getGradingSchemaById(gradingSchemaId, options);
}

export async function deleteGradingSchema(gradingSchemaId, options = {}) {
  return await scoped(model.gradingModel).destroy({
    where: { gradingId: Number(gradingSchemaId) },
    transaction: options.transaction,
  });
}

export async function createGradingSchemaGrade(gradingSchemaId, gradeData, options = {}) {
  return await model.gradingGradeModel.create(
    {
      ...gradeData,
      gradingId: Number(gradingSchemaId),
    },
    options
  );
}

export async function getGradingSchemaGrades(gradingSchemaId, options = {}) {
  return await model.gradingGradeModel.findAll({
    where: { gradingId: Number(gradingSchemaId) },
    order: [["sortOrder", "ASC"]],
    transaction: options.transaction,
  });
}

export async function getGradingSchemaGradeById(gradingSchemaGradeId, options = {}) {
  return await model.gradingGradeModel.findOne({
    where: { gradingGradeId: Number(gradingSchemaGradeId) },
    transaction: options.transaction,
  });
}

export async function updateGradingSchemaGrade(gradingSchemaGradeId, gradeData, options = {}) {
  await model.gradingGradeModel.update(gradeData, {
    where: { gradingGradeId: Number(gradingSchemaGradeId) },
    transaction: options.transaction,
  });
  return await getGradingSchemaGradeById(gradingSchemaGradeId, options);
}

export async function deleteGradingSchemaGrade(gradingSchemaGradeId, options = {}) {
  return await model.gradingGradeModel.destroy({
    where: { gradingGradeId: Number(gradingSchemaGradeId) },
    transaction: options.transaction,
  });
}

export async function updateGradingSchemaStatus(gradingSchemaId, status, updatedBy, options = {}) {
  await scoped(model.gradingModel).update(
    { status, updatedBy },
    {
      where: { gradingId: Number(gradingSchemaId) },
      transaction: options.transaction,
    }
  );
  return await getGradingSchemaById(gradingSchemaId, options);
}

