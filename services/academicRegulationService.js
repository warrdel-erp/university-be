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
    if (payload.evaluationPattern !== undefined) updateData.evaluationPattern = payload.evaluationPattern;
    if (payload.internalWeightage !== undefined) updateData.internalWeightage = payload.internalWeightage;
    if (payload.externalWeightage !== undefined) updateData.externalWeightage = payload.externalWeightage;
    if (payload.maximumInternalMarks !== undefined) updateData.maximumInternalMarks = payload.maximumInternalMarks;
    if (payload.maximumExternalMarks !== undefined) updateData.maximumExternalMarks = payload.maximumExternalMarks;
    if (payload.isInternalAssessmentMandatory !== undefined) updateData.isInternalAssessmentMandatory = payload.isInternalAssessmentMandatory;
    if (payload.isExternalAssessmentMandatory !== undefined) updateData.isExternalAssessmentMandatory = payload.isExternalAssessmentMandatory;
    if (payload.minimumAttendance !== undefined) updateData.minimumAttendance = payload.minimumAttendance;
    if (payload.isAssessmentCompletionRequired !== undefined) updateData.isAssessmentCompletionRequired = payload.isAssessmentCompletionRequired;
    if (payload.isPracticalCompletionRequired !== undefined) updateData.isPracticalCompletionRequired = payload.isPracticalCompletionRequired;
    if (payload.isProjectSubmissionRequired !== undefined) updateData.isProjectSubmissionRequired = payload.isProjectSubmissionRequired;
    if (payload.isInternshipCompletionRequired !== undefined) updateData.isInternshipCompletionRequired = payload.isInternshipCompletionRequired;
    if (payload.minimumOverallMarks !== undefined) updateData.minimumOverallMarks = payload.minimumOverallMarks;
    if (payload.minimumOverallPercentage !== undefined) updateData.minimumOverallPercentage = payload.minimumOverallPercentage;
    if (payload.minimumInternalMarks !== undefined) updateData.minimumInternalMarks = payload.minimumInternalMarks;
    if (payload.minimumExternalMarks !== undefined) updateData.minimumExternalMarks = payload.minimumExternalMarks;
    if (payload.mandatoryComponents !== undefined) updateData.mandatoryComponents = payload.mandatoryComponents;
    if (payload.calculateSGPA !== undefined) updateData.calculateSGPA = payload.calculateSGPA;
    if (payload.calculateCGPA !== undefined) updateData.calculateCGPA = payload.calculateCGPA;
    if (payload.calculatePercentage !== undefined) updateData.calculatePercentage = payload.calculatePercentage;
    if (payload.generateClass !== undefined) updateData.generateClass = payload.generateClass;
    if (payload.generateRank !== undefined) updateData.generateRank = payload.generateRank;
    if (payload.tieBreakingMethod !== undefined) updateData.tieBreakingMethod = payload.tieBreakingMethod;
    if (payload.isModerationEnabled !== undefined) updateData.isModerationEnabled = payload.isModerationEnabled;
    if (payload.isScalingEnabled !== undefined) updateData.isScalingEnabled = payload.isScalingEnabled;
    if (payload.isNormalizationEnabled !== undefined) updateData.isNormalizationEnabled = payload.isNormalizationEnabled;
    if (payload.isGraceMarksEnabled !== undefined) updateData.isGraceMarksEnabled = payload.isGraceMarksEnabled;
    if (payload.maximumGraceMarks !== undefined) updateData.maximumGraceMarks = payload.maximumGraceMarks;
    if (payload.graceApplicableTo !== undefined) updateData.graceApplicableTo = payload.graceApplicableTo;
    if (payload.allowWithheldResult !== undefined) updateData.allowWithheldResult = payload.allowWithheldResult;
    if (payload.resultFreeze !== undefined) updateData.resultFreeze = payload.resultFreeze;
    if (payload.allowResultRevision !== undefined) updateData.allowResultRevision = payload.allowResultRevision;
    if (payload.publishAutomatically !== undefined) updateData.publishAutomatically = payload.publishAutomatically;
    if (payload.approvalRequired !== undefined) updateData.approvalRequired = payload.approvalRequired;
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
