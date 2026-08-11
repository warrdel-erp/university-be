import express from "express";
import { z } from "zod";
import useAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { EVALUATION_PATTERNS, MANDATORY_COMPONENTS, TIE_BREAKING_METHODS, GRACE_APPLICABLE_TO, PROMOTION_METHODS, IMPROVEMENT_MARKS_CONSIDERED } from "../constant.js";
import { validate } from "../utility/validation.js";
import {
  createAcademicRegulation,
  getAcademicRegulations,
  getAcademicRegulationById,
  updateAcademicRegulation,
  deleteAcademicRegulation,
  createCourseMapping,
  getCourseMappings,
  deleteCourseMapping,
} from "../controllers/academicRegulationController.js";

const router = express.Router();

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerId = z.coerce.number().int().positive();

const classificationItemSchema = z.object({
  classificationName: z.string().min(1).max(100),
  minimumCgpa: z.coerce.number().optional().nullable(),
  minimumPercentage: z.coerce.number().optional().nullable(),
  sortOrder: z.coerce.number().int().optional().nullable(),
});

export const getCourseMappingsQuerySchema = z.object({
  academicRegulationId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  courseId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  sessionId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
});

export const createCourseMappingBody = z.object({
  academicRegulationId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive(),
  sessionId: z.coerce.number().int().positive(),
});

export const createAcademicRegulationBody = z.object({
  // ==========================================
  // STEP 1: BASIC INFORMATION
  // ==========================================
  regulationCode: z.string().min(1).max(50),
  regulationName: z.string().min(1).max(150),
  description: z.string().max(500).optional().nullable(),
  academicYearRange: z.string().max(50).optional().nullable(),
  applicableBatch: z.string().max(50).optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveUntil: z.string().optional().nullable(),
  gradingSchemeId: z.coerce.number().int().positive().optional().nullable(),
  academicYearId: z.coerce.number().int().positive().optional().nullable(),

  // ==========================================
  // STEP 2: EVALUATION PATTERN & WEIGHTAGE
  // ==========================================
  evaluationPattern: z.enum(EVALUATION_PATTERNS).optional().nullable(),
  internalWeightage: z.coerce.number().optional().nullable(),
  externalWeightage: z.coerce.number().optional().nullable(),
  maximumInternalMarks: z.coerce.number().int().optional().nullable(),
  maximumExternalMarks: z.coerce.number().int().optional().nullable(),
  isInternalAssessmentMandatory: z.boolean().optional().nullable(),
  isExternalAssessmentMandatory: z.boolean().optional().nullable(),

  // ==========================================
  // STEP 3: PASSING RULES & ELIGIBILITY CRITERIA
  // ==========================================
  minimumAttendance: z.coerce.number().optional().nullable(),
  isAssessmentCompletionRequired: z.boolean().optional().nullable(),
  isPracticalCompletionRequired: z.boolean().optional().nullable(),
  isProjectSubmissionRequired: z.boolean().optional().nullable(),
  isInternshipCompletionRequired: z.boolean().optional().nullable(),
  minimumOverallMarks: z.coerce.number().int().optional().nullable(),
  minimumOverallPercentage: z.coerce.number().optional().nullable(),
  minimumInternalMarks: z.coerce.number().int().optional().nullable(),
  minimumExternalMarks: z.coerce.number().int().optional().nullable(),
  mandatoryComponents: z.array(z.enum(MANDATORY_COMPONENTS)).optional().nullable(),

  // ==========================================
  // STEP 4: GPA & RANKING RULES
  // ==========================================
  calculateSGPA: z.boolean().optional().default(true),
  calculateCGPA: z.boolean().optional().default(true),
  calculatePercentage: z.boolean().optional().default(false),
  generateClass: z.boolean().optional().default(true),
  generateRank: z.boolean().optional().default(false),
  tieBreakingMethod: z.enum(TIE_BREAKING_METHODS).optional().nullable(),

  // ==========================================
  // STEP 5: MODERATION, GRACE MARKS & RESULT RULES
  // ==========================================
  isModerationEnabled: z.boolean().optional().default(true),
  isScalingEnabled: z.boolean().optional().default(false),
  isNormalizationEnabled: z.boolean().optional().default(false),
  isGraceMarksEnabled: z.boolean().optional().default(true),
  maximumGraceMarks: z.coerce.number().int().optional().default(5),
  graceApplicableTo: z.enum(GRACE_APPLICABLE_TO).optional().nullable(),
  allowWithheldResult: z.boolean().optional().default(true),
  resultFreeze: z.boolean().optional().default(true),
  allowResultRevision: z.boolean().optional().default(false),
  publishAutomatically: z.boolean().optional().default(false),
  approvalRequired: z.boolean().optional().default(true),

  // ==========================================
  // STEP 6: CREDIT REQUIREMENTS
  // ==========================================
  totalCredits: z.coerce.number().int().optional().nullable(),
  coreCredits: z.coerce.number().int().optional().nullable(),
  electiveCredits: z.coerce.number().int().optional().nullable(),
  openElectiveCredits: z.coerce.number().int().optional().nullable(),
  internshipCredits: z.coerce.number().int().optional().nullable(),
  projectCredits: z.coerce.number().int().optional().nullable(),

  // ==========================================
  // STEP 7: PROMOTION & ATKT RULES
  // ==========================================
  isAtktEnabled: z.boolean().optional().default(true),
  maximumAtktSubjects: z.coerce.number().int().optional().nullable(),
  isCarryForwardEnabled: z.boolean().optional().default(true),
  maximumCarryForwardSubjects: z.coerce.number().int().optional().nullable(),
  promotionMethod: z.enum(PROMOTION_METHODS).optional().nullable(),

  // ==========================================
  // STEP 8: IMPROVEMENT RULES
  // ==========================================
  isImprovementAllowed: z.boolean().optional().default(false),
  maximumImprovementAttempts: z.coerce.number().int().optional().nullable(),
  improvementMarksConsidered: z.enum(IMPROVEMENT_MARKS_CONSIDERED).optional().nullable(),

  // ==========================================
  // STEP 9: BACKLOG & SUPPLEMENTARY RULES
  // ==========================================
  isBacklogAllowed: z.boolean().optional().default(true),
  maximumBacklogAttempts: z.coerce.number().int().optional().nullable(),
  isSupplementaryAllowed: z.boolean().optional().default(true),
  backlogValidityYears: z.coerce.number().int().optional().nullable(),

  // ==========================================
  // STEP 10: GRADUATION & DEGREE COMPLETION REQUIREMENTS
  // ==========================================
  totalCreditsRequired: z.coerce.number().int().optional().nullable(),
  minimumCgpa: z.coerce.number().optional().nullable(),
  isInternshipMandatory: z.boolean().optional().default(false),
  isProjectMandatory: z.boolean().optional().default(false),
  isCapstoneMandatory: z.boolean().optional().default(false),
  isExitExaminationRequired: z.boolean().optional().default(false),
  isNoActiveBacklogsRequired: z.boolean().optional().default(true),
  isNoPendingFeesRequired: z.boolean().optional().default(true),
  isNoDisciplinaryHoldRequired: z.boolean().optional().default(true),
  minimumDegreeAttendancePercentage: z.coerce.number().optional().nullable(),

  // ==========================================
  // STEP 11: DEGREE CLASSIFICATIONS
  // ==========================================
  classifications: z.array(classificationItemSchema).optional().nullable(),

  // ==========================================
  // STEP 12: CERTIFICATES & TRANSCRIPT GENERATION RULES
  // ==========================================
  marksheetTemplateId: z.coerce.number().int().optional().nullable(),
  transcriptTemplateId: z.coerce.number().int().optional().nullable(),
  degreeCertificateTemplateId: z.coerce.number().int().optional().nullable(),
  provisionalCertificateTemplateId: z.coerce.number().int().optional().nullable(),
  isGenerateTranscriptAutomatically: z.boolean().optional().default(false),
  isGenerateMarksheetAutomatically: z.boolean().optional().default(false),
  isDigitalSignatureRequired: z.boolean().optional().default(true),
  isQrVerificationEnabled: z.boolean().optional().default(true),
  marksheetPrefix: z.string().max(50).optional().nullable(),
  transcriptPrefix: z.string().max(50).optional().nullable(),
  degreePrefix: z.string().max(50).optional().nullable(),
  isAutoNumberingEnabled: z.boolean().optional().default(true),

  // ==========================================
  // COURSE MAPPINGS
  // ==========================================
  courseMappings: z.array(z.object({
    courseId: z.coerce.number().int().positive(),
    sessionId: z.coerce.number().int().positive(),
  })).optional(),

  // STATUS & AUDIT
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("DRAFT"),
  isActive: z.boolean().optional().default(true),
});

export const updateAcademicRegulationBody = z.object({
  // ==========================================
  // STEP 1: BASIC INFORMATION
  // ==========================================
  regulationCode: z.string().min(1).max(50).optional(),
  regulationName: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional().nullable(),
  academicYearRange: z.string().max(50).optional().nullable(),
  applicableBatch: z.string().max(50).optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveUntil: z.string().optional().nullable(),
  gradingSchemeId: z.coerce.number().int().positive().optional().nullable(),
  academicYearId: z.coerce.number().int().positive().optional().nullable(),

  // ==========================================
  // STEP 2: EVALUATION PATTERN & WEIGHTAGE
  // ==========================================
  evaluationPattern: z.enum(EVALUATION_PATTERNS).optional().nullable(),
  internalWeightage: z.coerce.number().optional().nullable(),
  externalWeightage: z.coerce.number().optional().nullable(),
  maximumInternalMarks: z.coerce.number().int().optional().nullable(),
  maximumExternalMarks: z.coerce.number().int().optional().nullable(),
  isInternalAssessmentMandatory: z.boolean().optional().nullable(),
  isExternalAssessmentMandatory: z.boolean().optional().nullable(),

  // ==========================================
  // STEP 3: PASSING RULES & ELIGIBILITY CRITERIA
  // ==========================================
  minimumAttendance: z.coerce.number().optional().nullable(),
  isAssessmentCompletionRequired: z.boolean().optional().nullable(),
  isPracticalCompletionRequired: z.boolean().optional().nullable(),
  isProjectSubmissionRequired: z.boolean().optional().nullable(),
  isInternshipCompletionRequired: z.boolean().optional().nullable(),
  minimumOverallMarks: z.coerce.number().int().optional().nullable(),
  minimumOverallPercentage: z.coerce.number().optional().nullable(),
  minimumInternalMarks: z.coerce.number().int().optional().nullable(),
  minimumExternalMarks: z.coerce.number().int().optional().nullable(),
  mandatoryComponents: z.array(z.enum(MANDATORY_COMPONENTS)).optional().nullable(),

  // ==========================================
  // STEP 4: GPA & RANKING RULES
  // ==========================================
  calculateSGPA: z.boolean().optional(),
  calculateCGPA: z.boolean().optional(),
  calculatePercentage: z.boolean().optional(),
  generateClass: z.boolean().optional(),
  generateRank: z.boolean().optional(),
  tieBreakingMethod: z.enum(TIE_BREAKING_METHODS).optional().nullable(),

  // ==========================================
  // STEP 5: MODERATION, GRACE MARKS & RESULT RULES
  // ==========================================
  isModerationEnabled: z.boolean().optional(),
  isScalingEnabled: z.boolean().optional(),
  isNormalizationEnabled: z.boolean().optional(),
  isGraceMarksEnabled: z.boolean().optional(),
  maximumGraceMarks: z.coerce.number().int().optional().nullable(),
  graceApplicableTo: z.enum(GRACE_APPLICABLE_TO).optional().nullable(),
  allowWithheldResult: z.boolean().optional(),
  resultFreeze: z.boolean().optional(),
  allowResultRevision: z.boolean().optional(),
  publishAutomatically: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),

  // ==========================================
  // STEP 6: CREDIT REQUIREMENTS
  // ==========================================
  totalCredits: z.coerce.number().int().optional().nullable(),
  coreCredits: z.coerce.number().int().optional().nullable(),
  electiveCredits: z.coerce.number().int().optional().nullable(),
  openElectiveCredits: z.coerce.number().int().optional().nullable(),
  internshipCredits: z.coerce.number().int().optional().nullable(),
  projectCredits: z.coerce.number().int().optional().nullable(),

  // ==========================================
  // STEP 7: PROMOTION & ATKT RULES
  // ==========================================
  isAtktEnabled: z.boolean().optional(),
  maximumAtktSubjects: z.coerce.number().int().optional().nullable(),
  isCarryForwardEnabled: z.boolean().optional(),
  maximumCarryForwardSubjects: z.coerce.number().int().optional().nullable(),
  promotionMethod: z.enum(PROMOTION_METHODS).optional().nullable(),

  // ==========================================
  // STEP 8: IMPROVEMENT RULES
  // ==========================================
  isImprovementAllowed: z.boolean().optional(),
  maximumImprovementAttempts: z.coerce.number().int().optional().nullable(),
  improvementMarksConsidered: z.enum(IMPROVEMENT_MARKS_CONSIDERED).optional().nullable(),

  // ==========================================
  // STEP 9: BACKLOG & SUPPLEMENTARY RULES
  // ==========================================
  isBacklogAllowed: z.boolean().optional(),
  maximumBacklogAttempts: z.coerce.number().int().optional().nullable(),
  isSupplementaryAllowed: z.boolean().optional(),
  backlogValidityYears: z.coerce.number().int().optional().nullable(),

  // ==========================================
  // STEP 10: GRADUATION & DEGREE COMPLETION REQUIREMENTS
  // ==========================================
  totalCreditsRequired: z.coerce.number().int().optional().nullable(),
  minimumCgpa: z.coerce.number().optional().nullable(),
  isInternshipMandatory: z.boolean().optional(),
  isProjectMandatory: z.boolean().optional(),
  isCapstoneMandatory: z.boolean().optional(),
  isExitExaminationRequired: z.boolean().optional(),
  isNoActiveBacklogsRequired: z.boolean().optional(),
  isNoPendingFeesRequired: z.boolean().optional(),
  isNoDisciplinaryHoldRequired: z.boolean().optional(),
  minimumDegreeAttendancePercentage: z.coerce.number().optional().nullable(),

  // ==========================================
  // STEP 11: DEGREE CLASSIFICATIONS
  // ==========================================
  classifications: z.array(classificationItemSchema).optional().nullable(),

  // ==========================================
  // STEP 12: CERTIFICATES & TRANSCRIPT GENERATION RULES
  // ==========================================
  marksheetTemplateId: z.coerce.number().int().optional().nullable(),
  transcriptTemplateId: z.coerce.number().int().optional().nullable(),
  degreeCertificateTemplateId: z.coerce.number().int().optional().nullable(),
  provisionalCertificateTemplateId: z.coerce.number().int().optional().nullable(),
  isGenerateTranscriptAutomatically: z.boolean().optional(),
  isGenerateMarksheetAutomatically: z.boolean().optional(),
  isDigitalSignatureRequired: z.boolean().optional(),
  isQrVerificationEnabled: z.boolean().optional(),
  marksheetPrefix: z.string().max(50).optional().nullable(),
  transcriptPrefix: z.string().max(50).optional().nullable(),
  degreePrefix: z.string().max(50).optional().nullable(),
  isAutoNumberingEnabled: z.boolean().optional(),

  // STATUS & AUDIT
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isActive: z.boolean().optional(),
});

export const listAcademicRegulationQuery = z.object({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  courseId: z.union([z.string(), z.number()]).optional(),
  academicYearId: z.union([z.string(), z.number()]).optional(),
  academicYearRange: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

router.post(
  "/",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null),
  validate({ body: createAcademicRegulationBody }),
  createAcademicRegulation
);

router.get(
  "/",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  validate({ query: listAcademicRegulationQuery }),
  getAcademicRegulations
);

router.get(
  "/:academicRegulationId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getAcademicRegulationById
);

router.patch(
  "/:academicRegulationId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  validate({ body: updateAcademicRegulationBody }),
  updateAcademicRegulation
);

router.delete(
  "/:academicRegulationId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  deleteAcademicRegulation
);

// Course + Session Mapping Endpoints
router.post(
  "/courseRegulationMapping",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  validate({ body: createCourseMappingBody }),
  createCourseMapping
);

router.get(
  "/courseRegulationMapping/:academicRegulationId?",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  validate({ query: getCourseMappingsQuerySchema }),
  getCourseMappings
);

router.delete(
  "/courseRegulationMapping/:academicRegulationCourseMappingId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  deleteCourseMapping
);

export default router;
