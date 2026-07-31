import sequelize from "../database/sequelizeConfig.js";
import * as academicRegulationRepo from "../repository/academicRegulationRepository.js";

export async function createAcademicRegulation(payload, user) {
  return await sequelize.transaction(async (t) => {
    const regulationData = {
      ...payload,
      courseId: payload.courseId ? Number(payload.courseId) : null,
      gradingSchemeId: payload.gradingSchemeId ? Number(payload.gradingSchemeId) : null,
      status: payload.status || "DRAFT",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    return await academicRegulationRepo.createAcademicRegulation(regulationData, { transaction: t });
  });
}

export async function getAcademicRegulations(filters, user) {
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
  return await sequelize.transaction(async (t) => {
    const existing = await academicRegulationRepo.getAcademicRegulationById(academicRegulationId, { transaction: t });
    if (!existing) {
      const error = new Error("Academic regulation not found");
      error.statusCode = 404;
      throw error;
    }

    const universityId = user?.universityId || existing.universityId;

    if (payload.regulationCode && payload.regulationCode !== existing.regulationCode) {
      const codeConflict = await academicRegulationRepo.findAcademicRegulationByCode(payload.regulationCode, universityId, academicRegulationId, { transaction: t });
      if (codeConflict) {
        const error = new Error(`Academic regulation with code '${payload.regulationCode}' already exists`);
        error.statusCode = 400;
        throw error;
      }
    }

    const updateData = {
      updatedBy: user?.userId || null,
    };
    if (user?.universityId) updateData.universityId = Number(user.universityId);
    if (user?.instituteId) updateData.instituteId = Number(user.instituteId);

    if (payload.regulationName !== undefined) updateData.regulationName = payload.regulationName;
    if (payload.regulationCode !== undefined) updateData.regulationCode = payload.regulationCode;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.courseId !== undefined) updateData.courseId = payload.courseId ? Number(payload.courseId) : null;
    if (payload.academicYearRange !== undefined) updateData.academicYearRange = payload.academicYearRange;
    if (payload.applicableBatch !== undefined) updateData.applicableBatch = payload.applicableBatch;
    if (payload.effectiveFrom !== undefined) updateData.effectiveFrom = payload.effectiveFrom;
    if (payload.effectiveUntil !== undefined) updateData.effectiveUntil = payload.effectiveUntil;
    if (payload.gradingSchemeId !== undefined) updateData.gradingSchemeId = payload.gradingSchemeId ? Number(payload.gradingSchemeId) : null;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

    return await academicRegulationRepo.updateAcademicRegulation(academicRegulationId, updateData, { transaction: t });
  });
}

export async function deleteAcademicRegulation(academicRegulationId) {
  return await sequelize.transaction(async (t) => {
    const existing = await academicRegulationRepo.getAcademicRegulationById(academicRegulationId, { transaction: t });
    if (!existing) {
      const error = new Error("Academic regulation not found");
      error.statusCode = 404;
      throw error;
    }
    await academicRegulationRepo.deleteAcademicRegulation(academicRegulationId, { transaction: t });
    return { message: "Academic regulation deleted successfully" };
  });
}
