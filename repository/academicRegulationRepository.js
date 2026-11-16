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

export async function findActiveBatchRegulationMappings(batchIds, excludeAcademicRegulationId = null, options = {}) {
  const ids = (Array.isArray(batchIds) ? batchIds : [batchIds])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (ids.length === 0) return [];

  const where = {
    batchId: { [Op.in]: ids },
  };
  if (excludeAcademicRegulationId) {
    where.academicRegulationId = { [Op.ne]: Number(excludeAcademicRegulationId) };
  }

  return await scoped(model.academicRegulationCourseMappingModel).findAll({
    where,
    include: [
      {
        model: model.academicRegulationModel,
        as: "academicRegulation",
        attributes: ["academicRegulationId", "regulationCode", "regulationName"],
        required: false,
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch"],
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function createAcademicRegulation(data, options = {}) {
  const { courseMappings, batchMappings, ...regulationData } = data;
  const mappings = batchMappings || courseMappings;

  const submittedBatchIds = Array.isArray(mappings)
    ? [...new Set(mappings.map((item) => Number(item?.batchId ?? item)).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

  if (submittedBatchIds.length > 0) {
    const conflictingMappings = await findActiveBatchRegulationMappings(submittedBatchIds, null, options);
    if (conflictingMappings.length > 0) {
      const details = conflictingMappings.map((c) => {
        const batchLabel = c.batch?.batch ? `Batch '${c.batch.batch}' (ID: ${c.batchId})` : `Batch ID ${c.batchId}`;
        const regLabel = c.academicRegulation?.regulationName
          ? `'${c.academicRegulation.regulationName}' (${c.academicRegulation.regulationCode || c.academicRegulationId})`
          : `Regulation ID ${c.academicRegulationId}`;
        return `${batchLabel} is already mapped to ${regLabel}`;
      }).join("; ");
      const error = new Error(`Cannot map batch: ${details}. A batch can only be mapped to one academic regulation.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const record = await scoped(model.academicRegulationModel).create({
    ...regulationData,
    version: 1.0,
  }, options);

  if (submittedBatchIds.length > 0) {
    const mappingsToCreate = submittedBatchIds.map((bId) => ({
      academicRegulationId: record.academicRegulationId,
      batchId: bId,
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
    const submittedBatchIds = [
      ...new Set(mappings.map((m) => Number(m?.batchId ?? m)).filter((id) => Number.isInteger(id) && id > 0)),
    ];

    if (submittedBatchIds.length > 0) {
      const conflictingMappings = await findActiveBatchRegulationMappings(
        submittedBatchIds,
        academicRegulationId,
        options
      );
      if (conflictingMappings.length > 0) {
        const details = conflictingMappings.map((c) => {
          const batchLabel = c.batch?.batch ? `Batch '${c.batch.batch}' (ID: ${c.batchId})` : `Batch ID ${c.batchId}`;
          const regLabel = c.academicRegulation?.regulationName
            ? `'${c.academicRegulation.regulationName}' (${c.academicRegulation.regulationCode || c.academicRegulationId})`
            : `Regulation ID ${c.academicRegulationId}`;
          return `${batchLabel} is already mapped to ${regLabel}`;
        }).join("; ");
        const error = new Error(`Cannot map batch: ${details}. A batch can only be mapped to one academic regulation.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const existingMappings = await scoped(model.academicRegulationCourseMappingModel).findAll({
      where: { academicRegulationId: Number(academicRegulationId) },
      paranoid: false,
      transaction: options.transaction,
    });

    const activeExistingBatchIds = new Set(
      existingMappings.filter((m) => !m.deletedAt).map((m) => Number(m.batchId))
    );

    const toDeleteIds = existingMappings
      .filter((m) => !m.deletedAt && !submittedBatchIds.includes(Number(m.batchId)))
      .map((m) => m.academicRegulationCourseMappingId);

    if (toDeleteIds.length > 0) {
      await scoped(model.academicRegulationCourseMappingModel).destroy({
        where: { academicRegulationCourseMappingId: toDeleteIds },
        force: true,
        transaction: options.transaction,
      });
    }

    for (const bId of submittedBatchIds) {
      if (!activeExistingBatchIds.has(bId)) {
        const softDeleted = existingMappings.find((m) => Number(m.batchId) === bId && m.deletedAt);
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
  const targetBatchId = Number(data.batchId);
  const targetRegulationId = Number(data.academicRegulationId);

  // 1. Check if the batch is already actively mapped to ANY academic regulation
  const activeExisting = await scoped(model.academicRegulationCourseMappingModel).findOne({
    where: {
      batchId: targetBatchId,
    },
    include: [
      {
        model: model.academicRegulationModel,
        as: "academicRegulation",
        attributes: ["academicRegulationId", "regulationCode", "regulationName"],
        required: false,
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch"],
        required: false,
      },
    ],
    transaction: options.transaction,
  });

  if (activeExisting) {
    if (Number(activeExisting.academicRegulationId) === targetRegulationId) {
      const error = new Error("This batch is already mapped to this academic regulation");
      error.statusCode = 400;
      throw error;
    } else {
      const batchLabel = activeExisting.batch?.batch
        ? `Batch '${activeExisting.batch.batch}' (ID: ${targetBatchId})`
        : `Batch ID ${targetBatchId}`;
      const regLabel = activeExisting.academicRegulation?.regulationName
        ? `'${activeExisting.academicRegulation.regulationName}' (${activeExisting.academicRegulation.regulationCode || activeExisting.academicRegulationId})`
        : `Regulation ID ${activeExisting.academicRegulationId}`;
      const error = new Error(
        `${batchLabel} is already mapped to ${regLabel}. A batch can only be mapped to one academic regulation.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 2. If not actively mapped anywhere, check if there is a soft-deleted mapping for THIS regulation to restore
  const softDeleted = await scoped(model.academicRegulationCourseMappingModel).findOne({
    where: {
      academicRegulationId: targetRegulationId,
      batchId: targetBatchId,
    },
    paranoid: false,
    transaction: options.transaction,
  });

  let mappingId;
  if (softDeleted && softDeleted.deletedAt) {
    await softDeleted.restore({ transaction: options.transaction });
    await softDeleted.update(
      {
        universityId: data.universityId,
        instituteId: data.instituteId,
        updatedBy: data.updatedBy,
      },
      { transaction: options.transaction }
    );
    mappingId = softDeleted.academicRegulationCourseMappingId;
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
