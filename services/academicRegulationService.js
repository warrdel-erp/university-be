import sequelize from "../database/sequelizeConfig.js";
import * as academicRegulationRepo from "../repository/academicRegulationRepository.js";

export async function createAcademicRegulation(payload, user) {
  return await sequelize.transaction(async (t) => {
    const regulationData = {
      ...payload,
      courseId: payload.courseId ? Number(payload.courseId) : null,
      sessionId: payload.sessionId ? Number(payload.sessionId) : null,
      academicYearId: payload.academicYearId ? Number(payload.academicYearId) : (user?.academicYearId || null),
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
    if (payload.sessionId !== undefined) updateData.sessionId = payload.sessionId ? Number(payload.sessionId) : null;
    if (payload.academicYearId !== undefined) updateData.academicYearId = payload.academicYearId ? Number(payload.academicYearId) : null;
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
    if (payload.totalCredits !== undefined) updateData.totalCredits = payload.totalCredits;
    if (payload.coreCredits !== undefined) updateData.coreCredits = payload.coreCredits;
    if (payload.electiveCredits !== undefined) updateData.electiveCredits = payload.electiveCredits;
    if (payload.openElectiveCredits !== undefined) updateData.openElectiveCredits = payload.openElectiveCredits;
    if (payload.internshipCredits !== undefined) updateData.internshipCredits = payload.internshipCredits;
    if (payload.projectCredits !== undefined) updateData.projectCredits = payload.projectCredits;
    if (payload.isAtktEnabled !== undefined) updateData.isAtktEnabled = payload.isAtktEnabled;
    if (payload.maximumAtktSubjects !== undefined) updateData.maximumAtktSubjects = payload.maximumAtktSubjects;
    if (payload.isCarryForwardEnabled !== undefined) updateData.isCarryForwardEnabled = payload.isCarryForwardEnabled;
    if (payload.maximumCarryForwardSubjects !== undefined) updateData.maximumCarryForwardSubjects = payload.maximumCarryForwardSubjects;
    if (payload.promotionMethod !== undefined) updateData.promotionMethod = payload.promotionMethod;
    if (payload.isImprovementAllowed !== undefined) updateData.isImprovementAllowed = payload.isImprovementAllowed;
    if (payload.maximumImprovementAttempts !== undefined) updateData.maximumImprovementAttempts = payload.maximumImprovementAttempts;
    if (payload.improvementMarksConsidered !== undefined) updateData.improvementMarksConsidered = payload.improvementMarksConsidered;
    if (payload.isBacklogAllowed !== undefined) updateData.isBacklogAllowed = payload.isBacklogAllowed;
    if (payload.maximumBacklogAttempts !== undefined) updateData.maximumBacklogAttempts = payload.maximumBacklogAttempts;
    if (payload.isSupplementaryAllowed !== undefined) updateData.isSupplementaryAllowed = payload.isSupplementaryAllowed;
    if (payload.backlogValidityYears !== undefined) updateData.backlogValidityYears = payload.backlogValidityYears;
    if (payload.totalCreditsRequired !== undefined) updateData.totalCreditsRequired = payload.totalCreditsRequired;
    if (payload.minimumCgpa !== undefined) updateData.minimumCgpa = payload.minimumCgpa;
    if (payload.isInternshipMandatory !== undefined) updateData.isInternshipMandatory = payload.isInternshipMandatory;
    if (payload.isProjectMandatory !== undefined) updateData.isProjectMandatory = payload.isProjectMandatory;
    if (payload.isCapstoneMandatory !== undefined) updateData.isCapstoneMandatory = payload.isCapstoneMandatory;
    if (payload.isExitExaminationRequired !== undefined) updateData.isExitExaminationRequired = payload.isExitExaminationRequired;
    if (payload.isNoActiveBacklogsRequired !== undefined) updateData.isNoActiveBacklogsRequired = payload.isNoActiveBacklogsRequired;
    if (payload.isNoPendingFeesRequired !== undefined) updateData.isNoPendingFeesRequired = payload.isNoPendingFeesRequired;
    if (payload.isNoDisciplinaryHoldRequired !== undefined) updateData.isNoDisciplinaryHoldRequired = payload.isNoDisciplinaryHoldRequired;
    if (payload.minimumDegreeAttendancePercentage !== undefined) updateData.minimumDegreeAttendancePercentage = payload.minimumDegreeAttendancePercentage;
    if (payload.classifications !== undefined) updateData.classifications = payload.classifications;
    if (payload.marksheetTemplateId !== undefined) updateData.marksheetTemplateId = payload.marksheetTemplateId;
    if (payload.transcriptTemplateId !== undefined) updateData.transcriptTemplateId = payload.transcriptTemplateId;
    if (payload.degreeCertificateTemplateId !== undefined) updateData.degreeCertificateTemplateId = payload.degreeCertificateTemplateId;
    if (payload.provisionalCertificateTemplateId !== undefined) updateData.provisionalCertificateTemplateId = payload.provisionalCertificateTemplateId;
    if (payload.isGenerateTranscriptAutomatically !== undefined) updateData.isGenerateTranscriptAutomatically = payload.isGenerateTranscriptAutomatically;
    if (payload.isGenerateMarksheetAutomatically !== undefined) updateData.isGenerateMarksheetAutomatically = payload.isGenerateMarksheetAutomatically;
    if (payload.isDigitalSignatureRequired !== undefined) updateData.isDigitalSignatureRequired = payload.isDigitalSignatureRequired;
    if (payload.isQrVerificationEnabled !== undefined) updateData.isQrVerificationEnabled = payload.isQrVerificationEnabled;
    if (payload.marksheetPrefix !== undefined) updateData.marksheetPrefix = payload.marksheetPrefix;
    if (payload.transcriptPrefix !== undefined) updateData.transcriptPrefix = payload.transcriptPrefix;
    if (payload.degreePrefix !== undefined) updateData.degreePrefix = payload.degreePrefix;
    if (payload.isAutoNumberingEnabled !== undefined) updateData.isAutoNumberingEnabled = payload.isAutoNumberingEnabled;
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

export async function createCourseMapping({ academicRegulationId, courseId, sessionId }) {
  return await sequelize.transaction(async (t) => {
    const existingRegulation = await academicRegulationRepo.getAcademicRegulationById(academicRegulationId, { transaction: t });
    if (!existingRegulation) {
      const error = new Error("Academic regulation not found");
      error.statusCode = 404;
      throw error;
    }
    return await academicRegulationRepo.createCourseMapping(
      {
        academicRegulationId: Number(academicRegulationId),
        courseId: Number(courseId),
        sessionId: Number(sessionId),
      },
      { transaction: t }
    );
  });
}

export async function getCourseMappings(filters = {}) {
  return await academicRegulationRepo.getCourseMappings(filters);
}

export async function deleteCourseMapping(academicRegulationCourseMappingId) {
  return await sequelize.transaction(async (t) => {
    await academicRegulationRepo.deleteCourseMapping(academicRegulationCourseMappingId, { transaction: t });
    return { message: "Course mapping deleted successfully" };
  });
}
