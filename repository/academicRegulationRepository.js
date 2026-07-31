import { Op } from "sequelize";
import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import { decimalAdd } from '../utility/decimalMoney.js';

export async function findAcademicRegulationByCode(regulationCode, universityId, excludeId = null, options = {}) {
  const where = {
    regulationCode,
    universityId: Number(universityId),
  };
  if (excludeId) {
    where.academicRegulationId = { [Op.ne]: Number(excludeId) };
  }
  return await scoped(model.academicRegulationModel).findOne({ where, transaction: options.transaction });
}

export async function createAcademicRegulation(data, options = {}) {
  const record = await scoped(model.academicRegulationModel).create({
    ...data,
    version: 1.0,
  }, options);
  return await getAcademicRegulationById(record.academicRegulationId, options);
}

export async function getAcademicRegulations({ search, status, courseId, academicYearRange, page = 1, limit = 10 }) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (courseId) {
    where.courseId = Number(courseId);
  }
  if (academicYearRange) {
    where.academicYearRange = academicYearRange;
  }
  if (search) {
    where[Op.or] = [
      { regulationName: { [Op.like]: `%${search}%` } },
      { regulationCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await scoped(model.academicRegulationModel).findAndCountAll({
    where,
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.gradingModel,
        as: "gradingScheme",
        attributes: ["gradingId", "gradingName", "gradingCode", "gradingMethod"],
        required: false,
      },
    ],
    distinct: true,
    order: [["academicRegulationId", "DESC"]],
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

export async function getAcademicRegulationById(academicRegulationId, options = {}) {
  return await scoped(model.academicRegulationModel).findOne({
    where: { academicRegulationId: Number(academicRegulationId) },
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.gradingModel,
        as: "gradingScheme",
        attributes: ["gradingId", "gradingName", "gradingCode", "gradingMethod"],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function updateAcademicRegulation(academicRegulationId, data, options = {}) {
  const existing = await scoped(model.academicRegulationModel).findOne({
    where: { academicRegulationId: Number(academicRegulationId) },
    transaction: options.transaction,
  });

  if (!existing) {
    return null;
  }

  const currentVersion = Number(existing.version) || 1.0;
  const nextVersion = decimalAdd(currentVersion, 0.1);

  await scoped(model.academicRegulationModel).update(
    {
      ...data,
      version: nextVersion,
    },
    {
      where: { academicRegulationId: Number(academicRegulationId) },
      transaction: options.transaction,
    }
  );

  return await getAcademicRegulationById(academicRegulationId, options);
}

export async function deleteAcademicRegulation(academicRegulationId, options = {}) {
  return await scoped(model.academicRegulationModel).destroy({
    where: { academicRegulationId: Number(academicRegulationId) },
    transaction: options.transaction,
  });
}
