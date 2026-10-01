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
  const { courseMappings, batchMappings, ...regulationData } = data;
  const mappings = batchMappings || courseMappings;
  const record = await scoped(model.academicRegulationModel).create({
    ...regulationData,
    version: 1.0,
  }, options);

  if (Array.isArray(mappings) && mappings.length > 0) {
    const mappingsToCreate = mappings.map((item) => ({
      academicRegulationId: record.academicRegulationId,
      batchId: Number(item.batchId ?? item),
      instituteId: record.instituteId,
      universityId: record.universityId,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    }));

    await Promise.all(
      mappingsToCreate.map((item) =>
        scoped(model.academicRegulationCourseMappingModel).create(item, { transaction: options.transaction })
      )
    );
  }

  return await getAcademicRegulationById(record.academicRegulationId, options);
}

export async function getAcademicRegulations({ search, status, batchId, courseId, academicYearRange, page = 1, limit = 10 }) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (batchId) {
    const matchingMappings = await scoped(model.academicRegulationCourseMappingModel).findAll({
      attributes: ['academicRegulationId'],
      where: { batchId: Number(batchId) },
      raw: true,
    });
    const regulationIds = matchingMappings.map(m => m.academicRegulationId);
    where.academicRegulationId = { [Op.in]: regulationIds };
  } else if (courseId) {
    // If courseId is provided, resolve batchIds associated with the course
    const matchingBatches = await scoped(model.batchModel).findAll({
      attributes: ['batchId'],
      include: [
        {
          model: model.sessionModel,
          as: 'session',
          where: { courseId: Number(courseId) },
          attributes: [],
        },
      ],
      raw: true,
    });
    const batchIds = matchingBatches.map(b => b.batchId);
    if (batchIds.length > 0) {
      const matchingMappings = await scoped(model.academicRegulationCourseMappingModel).findAll({
        attributes: ['academicRegulationId'],
        where: { batchId: { [Op.in]: batchIds } },
        raw: true,
      });
      const regulationIds = matchingMappings.map(m => m.academicRegulationId);
      where.academicRegulationId = { [Op.in]: regulationIds };
    }
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
        model: model.academicRegulationClassificationModel,
        as: "classifications",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: false,
      },
      {
        model: model.academicRegulationCourseMappingModel,
        as: "courseMappings",
        include: [
          {
            model: model.batchModel,
            as: "batch",
            attributes: ["batchId", "batch", "sessionId", "status"],
            include: [
              {
                model: model.sessionModel,
                as: "session",
                attributes: ["sessionId", "sessionName", "courseId"],
                include: [
                  { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
                ],
              },
            ],
          },
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
        model: model.academicRegulationClassificationModel,
        as: "classifications",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: false,
      },
      {
        model: model.academicRegulationCourseMappingModel,
        as: "courseMappings",
        include: [
          {
            model: model.batchModel,
            as: "batch",
            attributes: ["batchId", "batch", "sessionId", "status"],
            include: [
              {
                model: model.sessionModel,
                as: "session",
                attributes: ["sessionId", "sessionName", "courseId"],
                include: [
                  { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
                ],
              },
            ],
          },
        ],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function updateAcademicRegulation(academicRegulationId, data, options = {}) {
  const { classifications, courseMappings, batchMappings, ...updatePayload } = data;
  const mappings = batchMappings || courseMappings;

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

  if (Array.isArray(mappings)) {
    const existingMappings = await scoped(model.academicRegulationCourseMappingModel).findAll({
      where: { academicRegulationId: Number(academicRegulationId) },
      paranoid: false,
      transaction: options.transaction,
    });

    const submittedBatchIds = new Set(mappings.map(m => Number(m.batchId ?? m)));
    const activeExistingBatchIds = new Set(
      existingMappings.filter(m => !m.deletedAt).map(m => Number(m.batchId))
    );

    const toDeleteIds = existingMappings
      .filter(m => !m.deletedAt && !submittedBatchIds.has(Number(m.batchId)))
      .map(m => m.academicRegulationCourseMappingId);

    if (toDeleteIds.length > 0) {
      await scoped(model.academicRegulationCourseMappingModel).destroy({
        where: { academicRegulationCourseMappingId: toDeleteIds },
        force: true,
        transaction: options.transaction,
      });
    }

    for (const item of mappings) {
      const bId = Number(item.batchId ?? item);
      if (!activeExistingBatchIds.has(bId)) {
        const softDeleted = existingMappings.find(m => Number(m.batchId) === bId && m.deletedAt);
        if (softDeleted) {
          await softDeleted.restore({ transaction: options.transaction });
          await softDeleted.update(
            {
              instituteId: existing.instituteId,
              universityId: existing.universityId,
              updatedBy: data.updatedBy,
            },
            { transaction: options.transaction }
          );
        } else {
          await scoped(model.academicRegulationCourseMappingModel).create(
            {
              academicRegulationId: Number(academicRegulationId),
              batchId: bId,
              instituteId: existing.instituteId,
              universityId: existing.universityId,
              createdBy: data.updatedBy,
              updatedBy: data.updatedBy,
            },
            { transaction: options.transaction }
          );
        }
      }
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

export async function findCourseMapping(academicRegulationId, batchId, options = {}) {
  return await scoped(model.academicRegulationCourseMappingModel).findOne({
    where: {
      academicRegulationId: Number(academicRegulationId),
      batchId: Number(batchId),
    },
    paranoid: options.paranoid !== undefined ? options.paranoid : false,
    transaction: options.transaction,
  });
}

export async function createCourseMapping(data, options = {}) {
  const existing = await scoped(model.academicRegulationCourseMappingModel).findOne({
    where: {
      academicRegulationId: Number(data.academicRegulationId),
      batchId: Number(data.batchId),
    },
    paranoid: false,
    transaction: options.transaction,
  });

  let mappingId;
  if (existing) {
    if (existing.deletedAt) {
      await existing.restore({ transaction: options.transaction });
      await existing.update(
        {
          universityId: data.universityId,
          instituteId: data.instituteId,
          updatedBy: data.updatedBy,
        },
        { transaction: options.transaction }
      );
      mappingId = existing.academicRegulationCourseMappingId;
    } else {
      const error = new Error("This batch is already mapped to the academic regulation");
      error.statusCode = 400;
      throw error;
    }
  } else {
    const record = await scoped(model.academicRegulationCourseMappingModel).create(data, options);
    mappingId = record.academicRegulationCourseMappingId;
  }

  return await scoped(model.academicRegulationCourseMappingModel).findOne({
    where: { academicRegulationCourseMappingId: mappingId },
    include: [
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch", "sessionId", "status"],
        include: [
          {
            model: model.sessionModel,
            as: "session",
            attributes: ["sessionId", "sessionName", "courseId"],
            include: [
              { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

export async function getCourseMappings(filters = {}, options = {}) {
  const where = {};
  if (filters.academicRegulationId) {
    where.academicRegulationId = Number(filters.academicRegulationId);
  }
  if (filters.batchId) {
    where.batchId = Number(filters.batchId);
  }

  return await scoped(model.academicRegulationCourseMappingModel).findAll({
    where,
    include: [
      {
        model: model.academicRegulationModel,
        as: "academicRegulation",
        attributes: ["academicRegulationId", "regulationCode", "regulationName", "status"],
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch", "sessionId", "status"],
        include: [
          {
            model: model.sessionModel,
            as: "session",
            attributes: ["sessionId", "sessionName", "courseId"],
            include: [
              { model: model.courseModel, as: "course", attributes: ["courseId", "courseName", "courseCode"] },
            ],
          },
        ],
      },
    ],
    order: [["academicRegulationCourseMappingId", "DESC"]],
    transaction: options.transaction,
  });
}

export async function deleteCourseMapping(academicRegulationCourseMappingId, options = {}) {
  return await scoped(model.academicRegulationCourseMappingModel).destroy({
    where: { academicRegulationCourseMappingId: Number(academicRegulationCourseMappingId) },
    force: true,
    transaction: options.transaction,
  });
}
