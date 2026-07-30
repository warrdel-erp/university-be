import sequelize from "../database/sequelizeConfig.js";
import * as gradingSchemaRepo from "../repository/gradingSchemaRepository.js";

export async function createGradingSchema(payload, user) {
  const universityId = user?.universityId || payload.universityId;
  if (!universityId) {
    const error = new Error("University ID is required");
    error.statusCode = 400;
    throw error;
  }

  const existingCode = await gradingSchemaRepo.findGradingSchemaByCode(payload.gradingCode, universityId);
  if (existingCode) {
    const error = new Error(`Grading schema with code '${payload.gradingCode}' already exists`);
    error.statusCode = 400;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const gradingData = {
      universityId: Number(universityId),
      gradingName: payload.gradingName,
      gradingCode: payload.gradingCode,
      gradingMethod: payload.gradingMethod,
      description: payload.description || null,
      status: payload.status || "DRAFT",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    const createdGrading = await gradingSchemaRepo.createGradingSchema(gradingData, { transaction: t });

    await t.commit();
    return createdGrading;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

export async function getGradingSchemas(filters) {
  return await gradingSchemaRepo.getGradingSchemas(filters);
}

export async function getGradingSchemaById(gradingSchemaId) {
  const schema = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!schema) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }
  return schema;
}

export async function updateGradingSchema(gradingSchemaId, payload, user) {
  const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!existing) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }

  const universityId = user?.universityId || existing.universityId;

  if (payload.gradingCode && payload.gradingCode !== existing.gradingCode) {
    const codeConflict = await gradingSchemaRepo.findGradingSchemaByCode(payload.gradingCode, universityId, gradingSchemaId);
    if (codeConflict) {
      const error = new Error(`Grading schema with code '${payload.gradingCode}' already exists`);
      error.statusCode = 400;
      throw error;
    }
  }

  const t = await sequelize.transaction();
  try {
    const updateData = {
      updatedBy: user?.userId || null,
    };

    if (payload.gradingName !== undefined) updateData.gradingName = payload.gradingName;
    if (payload.gradingCode !== undefined) updateData.gradingCode = payload.gradingCode;
    if (payload.gradingMethod !== undefined) updateData.gradingMethod = payload.gradingMethod;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

    const updatedSchema = await gradingSchemaRepo.updateGradingSchema(gradingSchemaId, updateData, { transaction: t });

    await t.commit();
    return updatedSchema;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

export async function deleteGradingSchema(gradingSchemaId) {
  const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!existing) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    await gradingSchemaRepo.deleteGradingSchema(gradingSchemaId, { transaction: t });
    await t.commit();
    return { message: "Grading schema deleted successfully" };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

export async function createGradingSchemaGrade(gradingSchemaId, payload) {
  const schema = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!schema) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }
  return await gradingSchemaRepo.createGradingSchemaGrade(gradingSchemaId, payload);
}

export async function getGradingSchemaGrades(gradingSchemaId) {
  const schema = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!schema) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }
  return await gradingSchemaRepo.getGradingSchemaGrades(gradingSchemaId);
}

export async function getGradingSchemaGradeById(gradingSchemaId, gradingSchemaGradeId) {
  const grade = await gradingSchemaRepo.getGradingSchemaGradeById(gradingSchemaGradeId);
  if (!grade || Number(grade.gradingId) !== Number(gradingSchemaId)) {
    const error = new Error("Grading schema grade not found");
    error.statusCode = 404;
    throw error;
  }
  return grade;
}

export async function updateGradingSchemaGrade(gradingSchemaId, gradingSchemaGradeId, payload) {
  await getGradingSchemaGradeById(gradingSchemaId, gradingSchemaGradeId);
  return await gradingSchemaRepo.updateGradingSchemaGrade(gradingSchemaGradeId, payload);
}

export async function deleteGradingSchemaGrade(gradingSchemaId, gradingSchemaGradeId) {
  await getGradingSchemaGradeById(gradingSchemaId, gradingSchemaGradeId);
  await gradingSchemaRepo.deleteGradingSchemaGrade(gradingSchemaGradeId);
  return { message: "Grade deleted successfully" };
}

export async function publishGradingSchema(gradingSchemaId, user) {
  const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!existing) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }
  return await gradingSchemaRepo.updateGradingSchemaStatus(gradingSchemaId, "PUBLISHED", user?.userId || null);
}

export async function saveGradingSchemaDraft(gradingSchemaId, user) {
  const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!existing) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }
  return await gradingSchemaRepo.updateGradingSchemaStatus(gradingSchemaId, "DRAFT", user?.userId || null);
}

