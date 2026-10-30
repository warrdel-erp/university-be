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

export async function createGradingSchema(data, options = {}) {
  const newGrading = await scoped(model.gradingModel).create(data, options);
  return await getGradingSchemaById(newGrading.gradingId, options);
}

export async function isGradingSchemaMappedToAcademicRegulation(gradingSchemaId, universityId = null, options = {}) {
  const where = {
    gradingSchemeId: Number(gradingSchemaId),
    deletedAt: null,
  };
  if (universityId) {
    where.universityId = Number(universityId);
  }

  const count = await model.academicRegulationModel.count({
    where,
    transaction: options.transaction,
  });

  return count > 0;
}

export async function getGradingSchemas({ search, status, gradingMethod, distributionMethod, page = 1, limit = 10 }) {
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
  if (distributionMethod) {
    where.distributionMethod = distributionMethod;
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

  const gradingIds = rows.map((r) => Number(r.gradingId)).filter(Boolean);
  const mappedGradingIds = new Set();

  if (gradingIds.length > 0) {
    const regWhere = {
      gradingSchemeId: { [Op.in]: gradingIds },
      deletedAt: null,
    };
    if (rows[0]?.universityId) {
      regWhere.universityId = rows[0].universityId;
    }

    const mappedRegulations = await model.academicRegulationModel.findAll({
      attributes: ["gradingSchemeId"],
      where: regWhere,
      raw: true,
    });

    for (const reg of mappedRegulations) {
      if (reg.gradingSchemeId) {
        mappedGradingIds.add(Number(reg.gradingSchemeId));
      }
    }
  }

  for (const row of rows) {
    const isMapped = mappedGradingIds.has(Number(row.gradingId));
    const isEditable = !isMapped;
    row.setDataValue("isMapped", isMapped);
    row.setDataValue("isEditable", isEditable);
  }

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: rows,
  };
}

export async function getGradingSchemaById(gradingSchemaId, options = {}) {
  const schema = await scoped(model.gradingModel).findOne({
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

  if (schema) {
    const isMapped = await isGradingSchemaMappedToAcademicRegulation(
      schema.gradingId,
      schema.universityId,
      options
    );
    schema.setDataValue("isMapped", isMapped);
    schema.setDataValue("isEditable", !isMapped);
  }

  return schema;
}

export async function updateGradingSchema(gradingSchemaId, data, options = {}) {
  await scoped(model.gradingModel).update(data, {
    where: { gradingId: Number(gradingSchemaId) },
    transaction: options.transaction,
  });

  return await getGradingSchemaById(gradingSchemaId, options);
}

export async function deleteGradingSchema(gradingSchemaId, options = {}) {
  return await scoped(model.gradingModel).destroy({
    where: { gradingId: Number(gradingSchemaId) },
    transaction: options.transaction,
  });
}

export async function syncGradingSchemaGrades(gradingSchemaId, gradesList, options = {}) {
  const existingGrades = await model.gradingGradeModel.findAll({
    where: { gradingId: Number(gradingSchemaId) },
    transaction: options.transaction,
  });

  const submittedGradeIds = new Set(
    gradesList
      .map((g) => (g.gradingGradeId ? Number(g.gradingGradeId) : null))
      .filter(Boolean)
  );

  // Delete grades that were removed
  const toDelete = existingGrades.filter(
    (g) => !submittedGradeIds.has(Number(g.gradingGradeId))
  );
  if (toDelete.length > 0) {
    await model.gradingGradeModel.destroy({
      where: {
        gradingGradeId: toDelete.map((g) => g.gradingGradeId),
      },
      transaction: options.transaction,
    });
  }

  // Update existing or create new grades
  for (const gradeItem of gradesList) {
    const gradeData = {
      grade: gradeItem.grade,
      minPercentage: gradeItem.minPercentage !== undefined ? gradeItem.minPercentage : null,
      maxPercentage: gradeItem.maxPercentage !== undefined ? gradeItem.maxPercentage : null,
      lowerBound: gradeItem.lowerBound !== undefined ? gradeItem.lowerBound : null,
      upperBound: gradeItem.upperBound !== undefined ? gradeItem.upperBound : null,
      expectedStudentsPercentage: gradeItem.expectedStudentsPercentage !== undefined ? gradeItem.expectedStudentsPercentage : null,
      isRuleBased: gradeItem.isRuleBased !== undefined ? Boolean(gradeItem.isRuleBased) : false,
      gradePoint: gradeItem.gradePoint,
      resultLabel: gradeItem.resultLabel,
      remarks: gradeItem.remarks || null,
      sortOrder: gradeItem.sortOrder,
      isPass: gradeItem.isPass !== undefined ? Boolean(gradeItem.isPass) : true,
      isActive: gradeItem.isActive !== undefined ? Boolean(gradeItem.isActive) : true,
      gradingId: Number(gradingSchemaId),
    };

    if (gradeItem.gradingGradeId && submittedGradeIds.has(Number(gradeItem.gradingGradeId))) {
      const existingGrade = existingGrades.find(
        (g) => Number(g.gradingGradeId) === Number(gradeItem.gradingGradeId)
      );
      if (existingGrade) {
        await existingGrade.update(gradeData, { transaction: options.transaction });
        continue;
      }
    }

    await model.gradingGradeModel.create(gradeData, { transaction: options.transaction });
  }
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

