import sequelize from "../database/sequelizeConfig.js";
import * as academicRegulationRepo from "../repository/academicRegulationRepository.js";

export async function createAcademicRegulation(payload, user) {
  const universityId = user?.universityId || payload.universityId;
  const instituteId = user?.instituteId || payload.instituteId;
  const academicYearId = user?.academicYearId || payload.academicYearId;

  if (!universityId) {
    const error = new Error("University ID is required");
    error.statusCode = 400;
    throw error;
  }
  if (!instituteId) {
    const error = new Error("Institute ID is required");
    error.statusCode = 400;
    throw error;
  }
  if (!academicYearId) {
    const error = new Error("Academic Year ID is required");
    error.statusCode = 400;
    throw error;
  }

  const existingCode = await academicRegulationRepo.findAcademicRegulationByCode(payload.regulationCode, universityId);
  if (existingCode) {
    const error = new Error(`Academic regulation with code '${payload.regulationCode}' already exists`);
    error.statusCode = 400;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const regulationData = {
      universityId: Number(universityId),
      instituteId: Number(instituteId),
      academicYearId: Number(academicYearId),
      regulationCode: payload.regulationCode,
      regulationName: payload.regulationName,
      description: payload.description || null,
      courseId: payload.courseId ? Number(payload.courseId) : null,
      applicableBatch: payload.applicableBatch || null,
      effectiveFrom: payload.effectiveFrom || null,
      effectiveUntil: payload.effectiveUntil || null,
      gradingSchemeId: payload.gradingSchemeId ? Number(payload.gradingSchemeId) : null,
      status: payload.status || "DRAFT",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    const createdRecord = await academicRegulationRepo.createAcademicRegulation(regulationData, { transaction: t });

    await t.commit();
    return createdRecord;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

export async function getAcademicRegulations(filters, user) {
  if (!filters.academicYearId && user?.academicYearId) {
    filters.academicYearId = user.academicYearId;
  }
  return await academicRegulationRepo.getAcademicRegulations(filters);
}

export async function getAcademicRegulationById(academicRegulationId) {
  const record = await academicRegulationRepo.getAcademicRegulationById(academicRegulationId);
  if (!record) {
    const error = new Error("Academic regulation not found");
    error.statusCode = 404;
    throw error;
  }
  return record;
}

export async function updateAcademicRegulation(academicRegulationId, payload, user) {
  const existing = await academicRegulationRepo.getAcademicRegulationById(academicRegulationId);
  if (!existing) {
    const error = new Error("Academic regulation not found");
    error.statusCode = 404;
    throw error;
  }

  const universityId = user?.universityId || existing.universityId;

  if (payload.regulationCode && payload.regulationCode !== existing.regulationCode) {
    const codeConflict = await academicRegulationRepo.findAcademicRegulationByCode(payload.regulationCode, universityId, academicRegulationId);
    if (codeConflict) {
      const error = new Error(`Academic regulation with code '${payload.regulationCode}' already exists`);
      error.statusCode = 400;
      throw error;
    }
  }

  const t = await sequelize.transaction();
  try {
    const updateData = {
      updatedBy: user?.userId || null,
    };

    if (payload.regulationName !== undefined) updateData.regulationName = payload.regulationName;
    if (payload.regulationCode !== undefined) updateData.regulationCode = payload.regulationCode;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.courseId !== undefined) updateData.courseId = payload.courseId ? Number(payload.courseId) : null;
    if (payload.academicYearId !== undefined) updateData.academicYearId = payload.academicYearId ? Number(payload.academicYearId) : null;
    if (payload.applicableBatch !== undefined) updateData.applicableBatch = payload.applicableBatch;
    if (payload.effectiveFrom !== undefined) updateData.effectiveFrom = payload.effectiveFrom;
    if (payload.effectiveUntil !== undefined) updateData.effectiveUntil = payload.effectiveUntil;
    if (payload.gradingSchemeId !== undefined) updateData.gradingSchemeId = payload.gradingSchemeId ? Number(payload.gradingSchemeId) : null;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

    const updatedRecord = await academicRegulationRepo.updateAcademicRegulation(academicRegulationId, updateData, { transaction: t });

    await t.commit();
    return updatedRecord;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

export async function deleteAcademicRegulation(academicRegulationId) {
  const existing = await academicRegulationRepo.getAcademicRegulationById(academicRegulationId);
  if (!existing) {
    const error = new Error("Academic regulation not found");
    error.statusCode = 404;
    throw error;
  }
  await academicRegulationRepo.deleteAcademicRegulation(academicRegulationId);
  return { message: "Academic regulation deleted successfully" };
}
