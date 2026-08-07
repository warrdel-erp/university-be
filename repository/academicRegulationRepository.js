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

export async function getAcademicRegulations({ search, status, courseId, academicYearId, academicYearRange, page = 1, limit = 10 }) {
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
  if (academicYearId) {
    where.academicYearId = Number(academicYearId);
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
        model: model.gradingModel,
        as: "gradingScheme",
        attributes: ["gradingId", "gradingName", "gradingCode", "gradingMethod"],
        required: false,
      },
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.academicRegulationClassificationModel,
        as: "classifications",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: false,
      },
      {
        model: model.academicRegulationCourseMappingModel,
        as: "courseMappings",
        include: [
          { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
          { model: model.sessionModel, as: "session", attributes: ["sessionId", "sessionName"] },
        ],
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
        model: model.gradingModel,
        as: "gradingScheme",
        attributes: ["gradingId", "gradingName", "gradingCode", "gradingMethod"],
        required: false,
      },
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.academicRegulationClassificationModel,
        as: "classifications",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: false,
      },
      {
        model: model.academicRegulationCourseMappingModel,
        as: "courseMappings",
        include: [
          { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
          { model: model.sessionModel, as: "session", attributes: ["sessionId", "sessionName"] },
        ],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function updateAcademicRegulation(academicRegulationId, data, options = {}) {
  const { classifications, courseMappings, ...updatePayload } = data;

  const existing = await scoped(model.academicRegulationModel).findOne({
    where: { academicRegulationId: Number(academicRegulationId) },
    transaction: options.transaction,
  });

  if (!existing) {
    return null;
  }

  const currentVersion = Number(existing.version) || 1.0;
  const nextVersion = decimalAdd(currentVersion, 0.1);

  if (Object.keys(updatePayload).length > 0) {
    await scoped(model.academicRegulationModel).update(
      {
        ...updatePayload,
        version: nextVersion,
      },
      {
        where: { academicRegulationId: Number(academicRegulationId) },
        transaction: options.transaction,
      }
    );
  }

  if (Array.isArray(classifications)) {
    await scoped(model.academicRegulationClassificationModel).destroy({
      where: { academicRegulationId: Number(academicRegulationId) },
      transaction: options.transaction,
    });

    if (classifications.length > 0) {
      const recordsToCreate = classifications.map((item, index) => ({
        ...item,
        academicRegulationId: Number(academicRegulationId),
        sortOrder: item.sortOrder ?? index + 1,
      }));

      await Promise.all(
        recordsToCreate.map((item) =>
          scoped(model.academicRegulationClassificationModel).create(item, { transaction: options.transaction })
        )
      );
    }
  }

  if (Array.isArray(courseMappings)) {
    await scoped(model.academicRegulationCourseMappingModel).destroy({
      where: { academicRegulationId: Number(academicRegulationId) },
      transaction: options.transaction,
    });

    if (courseMappings.length > 0) {
      const mappingsToCreate = courseMappings.map((item) => ({
        academicRegulationId: Number(academicRegulationId),
        courseId: Number(item.courseId),
        sessionId: Number(item.sessionId),
      }));

      await Promise.all(
        mappingsToCreate.map((item) =>
          scoped(model.academicRegulationCourseMappingModel).create(item, { transaction: options.transaction })
        )
      );
    }
  }

  return await getAcademicRegulationById(academicRegulationId, options);
}

export async function deleteAcademicRegulation(academicRegulationId, options = {}) {
  const existing = await scoped(model.academicRegulationModel).findOne({
    where: { academicRegulationId: Number(academicRegulationId) },
    transaction: options.transaction,
  });

  if (!existing) {
    return null;
  }

  const newIsActive = !existing.isActive;

  await scoped(model.academicRegulationModel).update(
    { isActive: newIsActive },
    {
      where: { academicRegulationId: Number(academicRegulationId) },
      transaction: options.transaction,
    }
  );

  return {
    academicRegulationId: Number(academicRegulationId),
    isActive: newIsActive,
    message: `Academic regulation marked as ${newIsActive ? "active" : "inactive"} successfully`,
  };
}

export async function createCourseMapping(data, options = {}) {
  const record = await scoped(model.academicRegulationCourseMappingModel).create(data, options);
  return await scoped(model.academicRegulationCourseMappingModel).findOne({
    where: { academicRegulationCourseMappingId: record.academicRegulationCourseMappingId },
    include: [
      { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
      { model: model.sessionModel, as: "session", attributes: ["sessionId", "sessionName"] },
    ],
    transaction: options.transaction,
  });
}

export async function getCourseMappings(filters = {}, options = {}) {
  const where = {};
  if (filters.academicRegulationId) {
    where.academicRegulationId = Number(filters.academicRegulationId);
  }
  if (filters.courseId) {
    where.courseId = Number(filters.courseId);
  }
  if (filters.sessionId) {
    where.sessionId = Number(filters.sessionId);
  }

  return await scoped(model.academicRegulationCourseMappingModel).findAll({
    where,
    include: [
      {
        model: model.academicRegulationModel,
        as: "academicRegulation",
        attributes: ["academicRegulationId", "regulationCode", "regulationName", "status"],
      },
      { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
      { model: model.sessionModel, as: "session", attributes: ["sessionId", "sessionName"] },
    ],
    order: [["academicRegulationCourseMappingId", "DESC"]],
    transaction: options.transaction,
  });
}

export async function deleteCourseMapping(academicRegulationCourseMappingId, options = {}) {
  return await scoped(model.academicRegulationCourseMappingModel).destroy({
    where: { academicRegulationCourseMappingId: Number(academicRegulationCourseMappingId) },
    transaction: options.transaction,
  });
}
