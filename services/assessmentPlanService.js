import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";
import * as assessmentPlanRepo from "../repository/assessmentPlanRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";
import {
  decimalAdd,
  decimalCompare,
  decimalDivide,
  decimalGreaterThan,
  decimalGreaterThanOrEqual,
  decimalMultiply,
  decimalSubtract,
  toIntegerNumber,
  toMoneyNumber,
} from "../utility/decimalMoney.js";
import {
  resolveBatchCurrentPosition,
  resolveTotalTerms,
  termsPerYear,
} from "../utility/courseTerms.js";
import { resolveActiveAcademicYearContext } from "../utility/curriculumSubjectsByActiveYear.js";
import { getAcademicYearId } from "../utility/requestContext.js";

function parsePositiveId(val) {
  if (
    val === undefined ||
    val === null ||
    val === "" ||
    val === "undefined" ||
    val === "null" ||
    val === "NaN"
  ) {
    return undefined;
  }
  const num = toIntegerNumber(val);
  return decimalGreaterThan(num, 0) ? num : undefined;
}

function resolveDurationYears(course) {
  const courseDuration = toMoneyNumber(course.courseDuration);
  if (decimalGreaterThan(courseDuration, 0)) {
    return toIntegerNumber(courseDuration);
  }

  const totalTerms = resolveTotalTerms(course);
  const perYear = termsPerYear(course);
  if (!decimalGreaterThan(totalTerms, 0) || !decimalGreaterThan(perYear, 0)) {
    return 0;
  }

  const quotient = decimalDivide(totalTerms, perYear);
  const floored = toIntegerNumber(quotient);
  if (decimalGreaterThan(quotient, floored)) {
    return decimalAdd(floored, 1);
  }
  return floored;
}

function buildBatchName(batch, batchEndYear) {
  if (!decimalGreaterThan(batch, 0)) return null;
  if (!decimalGreaterThan(batchEndYear, 0)) return String(batch);
  const endSuffix = String(toIntegerNumber(batchEndYear)).slice(-2);
  return `${toIntegerNumber(batch)} – ${endSuffix}`;
}

function resolveSubjectKind(subjectType) {
  const normalized = String(subjectType || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("elective")) return "elective";
  if (normalized === "core" || normalized.includes("foundation")) return "core";
  return normalized;
}

function resolveBatchYear(batchMapping) {
  if (!batchMapping) {
    return null;
  }
  if (batchMapping.batch && batchMapping.batch.batch != null) {
    return Number(batchMapping.batch.batch);
  }
  return null;
}

function buildAssignmentStatus(totalSubjects, assignedSubjects) {
  if (
    !decimalGreaterThan(totalSubjects, 0) ||
    !decimalGreaterThan(assignedSubjects, 0)
  ) {
    return "Pending";
  }
  if (decimalGreaterThanOrEqual(assignedSubjects, totalSubjects)) {
    return "Fully Assigned";
  }
  return "Partially Assigned";
}

export function formatAcademicRegulationDetails(reg) {
  if (!reg) return null;
  const raw = reg.get ? reg.get({ plain: true }) : reg;
  return {
    academicRegulationId: raw.academicRegulationId,
    regulationCode: raw.regulationCode,
    regulationName: raw.regulationName,
    description: raw.description ?? null,
    academicYearRange: raw.academicYearRange ?? null,
    applicableBatch: raw.applicableBatch ?? null,
    effectiveFrom: raw.effectiveFrom ?? null,
    effectiveUntil: raw.effectiveUntil ?? null,
    version: raw.version ?? null,
    status: raw.status ?? null,
    isActive: raw.isActive ?? null,

    // Linked Grading Scheme
    gradingSchemeId: raw.gradingSchemeId ?? null,
    gradingScheme: raw.gradingScheme
      ? {
          gradingId: raw.gradingScheme.gradingId,
          gradingName: raw.gradingScheme.gradingName,
          gradingCode: raw.gradingScheme.gradingCode,
          gradingMethod: raw.gradingScheme.gradingMethod,
        }
      : null,

    // Step 2: Assessment Schemes (Evaluation Patterns)
    assessmentSchemes: Array.isArray(raw.assessmentSchemes)
      ? raw.assessmentSchemes.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          evaluationPattern: s.evaluationPattern,
          gradingSchemeId: s.gradingSchemeId,
          internalWeightage: s.internalWeightage,
          externalWeightage: s.externalWeightage,
          maximumInternalMarks: s.maximumInternalMarks,
          maximumExternalMarks: s.maximumExternalMarks,
          minimumInternalMarks: s.minimumInternalMarks,
          minimumExternalMarks: s.minimumExternalMarks,
          minimumOverallMarks: s.minimumOverallMarks,
          minimumOverallPercentage: s.minimumOverallPercentage,
          gradingScheme: s.gradingScheme
            ? {
                gradingId: s.gradingScheme.gradingId,
                gradingName: s.gradingScheme.gradingName,
                gradingCode: s.gradingScheme.gradingCode,
                gradingMethod: s.gradingScheme.gradingMethod,
              }
            : null,
        }))
      : [],

    // Legacy Evaluation Pattern & Weightage
    evaluationPattern: raw.evaluationPattern ?? null,
    internalWeightage: raw.internalWeightage ?? null,
    externalWeightage: raw.externalWeightage ?? null,
    maximumInternalMarks: raw.maximumInternalMarks ?? null,
    maximumExternalMarks: raw.maximumExternalMarks ?? null,
    isInternalAssessmentMandatory: raw.isInternalAssessmentMandatory ?? null,
    isExternalAssessmentMandatory: raw.isExternalAssessmentMandatory ?? null,

    // Step 3: Passing Rules & Eligibility Criteria
    minimumAttendance: raw.minimumAttendance ?? null,
    isAssessmentCompletionRequired: raw.isAssessmentCompletionRequired ?? null,
    isPracticalCompletionRequired: raw.isPracticalCompletionRequired ?? null,
    isProjectSubmissionRequired: raw.isProjectSubmissionRequired ?? null,
    isInternshipCompletionRequired: raw.isInternshipCompletionRequired ?? null,
    minimumOverallMarks: raw.minimumOverallMarks ?? null,
    minimumOverallPercentage: raw.minimumOverallPercentage ?? null,
    minimumInternalMarks: raw.minimumInternalMarks ?? null,
    minimumExternalMarks: raw.minimumExternalMarks ?? null,
    mandatoryComponents: raw.mandatoryComponents ?? null,

    // Step 4: GPA & Ranking Rules
    calculateSGPA: raw.calculateSGPA ?? null,
    calculateCGPA: raw.calculateCGPA ?? null,
    calculatePercentage: raw.calculatePercentage ?? null,
    generateClass: raw.generateClass ?? null,
    generateRank: raw.generateRank ?? null,
    tieBreakingMethod: raw.tieBreakingMethod ?? null,

    // Step 5: Moderation, Grace Marks & Result Rules
    isModerationEnabled: raw.isModerationEnabled ?? null,
    isScalingEnabled: raw.isScalingEnabled ?? null,
    isNormalizationEnabled: raw.isNormalizationEnabled ?? null,
    isGraceMarksEnabled: raw.isGraceMarksEnabled ?? null,
    maximumGraceMarks: raw.maximumGraceMarks ?? null,
    graceApplicableTo: raw.graceApplicableTo ?? null,
    allowWithheldResult: raw.allowWithheldResult ?? null,
    resultFreeze: raw.resultFreeze ?? null,
    allowResultRevision: raw.allowResultRevision ?? null,
    publishAutomatically: raw.publishAutomatically ?? null,
    approvalRequired: raw.approvalRequired ?? null,

    // Step 6: Credit Requirements
    totalCredits: raw.totalCredits ?? null,
    coreCredits: raw.coreCredits ?? null,
    electiveCredits: raw.electiveCredits ?? null,
    openElectiveCredits: raw.openElectiveCredits ?? null,
    internshipCredits: raw.internshipCredits ?? null,
    projectCredits: raw.projectCredits ?? null,

    // Step 7: Promotion & ATKT Rules
    isAtktEnabled: raw.isAtktEnabled ?? null,
    maximumAtktSubjects: raw.maximumAtktSubjects ?? null,
    isCarryForwardEnabled: raw.isCarryForwardEnabled ?? null,
    maximumCarryForwardSubjects: raw.maximumCarryForwardSubjects ?? null,
    promotionMethod: raw.promotionMethod ?? null,

    // Step 8: Improvement Rules
    isImprovementAllowed: raw.isImprovementAllowed ?? null,
    maximumImprovementAttempts: raw.maximumImprovementAttempts ?? null,
    improvementMarksConsidered: raw.improvementMarksConsidered ?? null,

    // Step 9: Backlog & Supplementary Rules
    isBacklogAllowed: raw.isBacklogAllowed ?? null,
    maximumBacklogAttempts: raw.maximumBacklogAttempts ?? null,
    isSupplementaryAllowed: raw.isSupplementaryAllowed ?? null,
    backlogValidityYears: raw.backlogValidityYears ?? null,

    // Step 10: Graduation & Degree Completion Requirements
    totalCreditsRequired: raw.totalCreditsRequired ?? null,
    minimumCgpa: raw.minimumCgpa ?? null,
    isInternshipMandatory: raw.isInternshipMandatory ?? null,
    isProjectMandatory: raw.isProjectMandatory ?? null,
    isCapstoneMandatory: raw.isCapstoneMandatory ?? null,
    isExitExaminationRequired: raw.isExitExaminationRequired ?? null,
    isNoActiveBacklogsRequired: raw.isNoActiveBacklogsRequired ?? null,
    isNoPendingFeesRequired: raw.isNoPendingFeesRequired ?? null,
    isNoDisciplinaryHoldRequired: raw.isNoDisciplinaryHoldRequired ?? null,
    minimumDegreeAttendancePercentage: raw.minimumDegreeAttendancePercentage ?? null,

    // Step 12: Certificates & Transcript Generation Rules
    marksheetTemplateId: raw.marksheetTemplateId ?? null,
    transcriptTemplateId: raw.transcriptTemplateId ?? null,
    degreeCertificateTemplateId: raw.degreeCertificateTemplateId ?? null,
    provisionalCertificateTemplateId: raw.provisionalCertificateTemplateId ?? null,
    isGenerateTranscriptAutomatically: raw.isGenerateTranscriptAutomatically ?? null,
    isGenerateMarksheetAutomatically: raw.isGenerateMarksheetAutomatically ?? null,
    isDigitalSignatureRequired: raw.isDigitalSignatureRequired ?? null,
    isQrVerificationEnabled: raw.isQrVerificationEnabled ?? null,
    marksheetPrefix: raw.marksheetPrefix ?? null,
    transcriptPrefix: raw.transcriptPrefix ?? null,
    degreePrefix: raw.degreePrefix ?? null,
    isAutoNumberingEnabled: raw.isAutoNumberingEnabled ?? null,
  };
}

function mapAssessmentPlanMapping(mapping) {
  const plain = mapping.get ? mapping.get({ plain: true }) : mapping;
  const plan = plain.assessmentPlan;

  return {
    assessmentPlanSubjectMappingId: plain.assessmentPlanSubjectMappingId,
    assessmentPlanId: plain.assessmentPlanId,
    batchId: plain.batchId,
    curriculumSubjectTermMappingId: plain.curriculumSubjectTermMappingId,
    subjectId: plain.subjectId,
    isFrozen: Boolean(plain.isFrozen),
    assessmentPlan: plan
      ? {
          assessmentPlanId: plan.assessmentPlanId,
          planName: plan.planName,
          status: plan.status || null,
          regulationId: plan.regulationId || null,
          academicRegulationAssesmentSchemeId:
            plan.academicRegulationAssesmentSchemeId || null,
          assessmentScheme: plan.assessmentScheme
            ? {
                id: plan.assessmentScheme.id,
                name: plan.assessmentScheme.name,
                code: plan.assessmentScheme.code,
                evaluationPattern: plan.assessmentScheme.evaluationPattern,
                gradingSchemeId: plan.assessmentScheme.gradingSchemeId,
                internalWeightage: plan.assessmentScheme.internalWeightage,
                externalWeightage: plan.assessmentScheme.externalWeightage,
                maximumInternalMarks: plan.assessmentScheme.maximumInternalMarks,
                maximumExternalMarks: plan.assessmentScheme.maximumExternalMarks,
                minimumInternalMarks: plan.assessmentScheme.minimumInternalMarks,
                minimumExternalMarks: plan.assessmentScheme.minimumExternalMarks,
                minimumOverallMarks: plan.assessmentScheme.minimumOverallMarks,
                minimumOverallPercentage: plan.assessmentScheme.minimumOverallPercentage,
                gradingScheme: plan.assessmentScheme.gradingScheme || null,
              }
            : null,
          academicRegulation: formatAcademicRegulationDetails(
            plan.academicRegulation,
          ),
        }
      : null,
  };
}

function resolveSubjectYearStatus(termYear, activeBatchYear) {
  const year = toIntegerNumber(termYear);
  const active = toIntegerNumber(activeBatchYear);
  if (!decimalGreaterThan(year, 0) || !decimalGreaterThan(active, 0)) {
    return null;
  }

  const cmp = decimalCompare(year, active);
  if (cmp < 0) return "previous";
  if (cmp > 0) return "upcoming";
  return "current";
}

/** Flat subject list; term + course live on each subject. */
function buildOverviewSubjects(batchMapping, rows, activeBatchYear, batchMappings = null) {
  const curriculum = batchMapping.curriculum;
  const course = curriculum.course;
  const batch = batchMapping.batch;
  const session = batch?.session || null;
  const batchYear = resolveBatchYear(batchMapping);
  const durationYears = resolveDurationYears(course);
  const batchEndYear = decimalGreaterThan(durationYears, 0)
    ? toIntegerNumber(decimalAdd(batchYear, durationYears))
    : null;

  const termMeta = new Map();
  for (const termMapping of batchMapping.termMappings || []) {
    const effectiveYear =
      termMapping.year ||
      (batchYear && termMapping.yearNumber
        ? toIntegerNumber(
            decimalSubtract(decimalAdd(batchYear, termMapping.yearNumber), 1),
          )
        : null);

    termMeta.set(Number(termMapping.term), {
      year: effectiveYear,
      yearNumber: termMapping.yearNumber,
      curriculumBatchTermMappingId: termMapping.curriculumBatchTermMappingId,
      status: resolveSubjectYearStatus(effectiveYear, activeBatchYear),
    });
  }

  const courseDetails = {
    courseId: course.courseId,
    courseName: course.courseName,
    courseCode: course.courseCode,
    termType: course.termType,
    totalTerms: course.totalTerms,
    courseDuration: course.courseDuration,
    durationYears,
  };

  const subjects = [];

  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const subject = plain.subject;
    if (!subject) continue;

    const term = Number(plain.term);
    const meta = termMeta.get(term) || {
      year: null,
      yearNumber: null,
      curriculumBatchTermMappingId: null,
      status: null,
    };

    const assessmentPlanMappings = (
      plain.assessmentPlanMappings ||
      subject.assessmentPlanMappings ||
      []
    ).map(mapAssessmentPlanMapping);

    subjects.push({
      curriculumSubjectTermMappingId: plain.curriculumSubjectTermMappingId,
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      shortName: subject.shortName,
      description: subject.description,
      isActive: subject.isActive,
      subjectType: subject.subjectType,
      subjectCategory: subject.subjectCategory,
      electiveOrCore: resolveSubjectKind(subject.subjectType),
      term,
      year: meta.year,
      yearNumber: meta.yearNumber,
      curriculumBatchTermMappingId: meta.curriculumBatchTermMappingId,
      status: meta.status,
      course: courseDetails,
      assignmentStatus:
        assessmentPlanMappings.length > 0 ? "assigned" : "unassigned",
      assessmentPlanMappings,
    });
  }

  const regMapping = batch?.regulationBatchMappings?.[0] || null;
  const reg = regMapping?.academicRegulation || null;

  let isFrozen = false;
  let publishStatus = "Draft";

  if (Array.isArray(batchMappings)) {
    const hasMappings = batchMappings.length > 0;
    isFrozen = hasMappings && batchMappings.every((m) => Boolean(m.isFrozen));
    publishStatus = isFrozen ? "Published" : "Draft";
  } else {
    let allFrozen = subjects.length > 0;
    let hasAnyMapping = false;
    for (const s of subjects) {
      if (!s.assessmentPlanMappings || s.assessmentPlanMappings.length === 0) {
        allFrozen = false;
      } else {
        hasAnyMapping = true;
        for (const m of s.assessmentPlanMappings) {
          if (!m.isFrozen) {
            allFrozen = false;
          }
        }
      }
    }

    isFrozen = hasAnyMapping && allFrozen;
    publishStatus = isFrozen ? "Published" : "Draft";
  }

  return {
    curriculumBatchMappingId: batchMapping.curriculumBatchMappingId,
    curriculumId: curriculum.curriculumId,
    batchId: batch?.batchId || null,
    batch: batchYear,
    batchEndYear,
    batchName: buildBatchName(batchYear, batchEndYear),
    publishStatus,
    isFrozen,
    academicRegulationId: reg?.academicRegulationId || null,
    academicRegulation: formatAcademicRegulationDetails(reg),
    sessionId: batch?.sessionId || null,
    session: session
      ? {
          sessionId: session.sessionId,
          sessionName: session.sessionName,
        }
      : null,
    activeBatchYear,
    curriculum: {
      curriculumId: curriculum.curriculumId,
      name: curriculum.name,
    },
    subjects,
  };
}

/** Whole-batch subjects: subject terms whose term exists on the batch term map. */
function collectBatchSubjectIds(plain) {
  if (!plain) return [];
  const batchTerms = new Set();
  for (const termMapping of plain.termMappings || []) {
    batchTerms.add(Number(termMapping.term));
  }

  const subjectIds = [];
  const curriculum = plain.curriculum;
  if (!curriculum) return subjectIds;
  for (const mapping of curriculum.subjectTermMappings || []) {
    if (batchTerms.size > 0 && !batchTerms.has(Number(mapping.term))) {
      continue;
    }
    subjectIds.push(mapping.subjectId);
  }
  return subjectIds;
}

function collectBatchIds(sessions) {
  const batchIds = new Set();
  for (const sess of sessions) {
    const plain = sess.get ? sess.get({ plain: true }) : sess;
    for (const batch of plain.batches || []) {
      if (batch.batchId) {
        batchIds.add(batch.batchId);
      }
    }
  }
  return [...batchIds];
}

function nestBatchCoursesWithSessions(sessions, assignedRows, activeBatchYear) {
  const assignedByBatch = new Map();
  const mappingsByBatch = new Map();
  for (const row of assignedRows) {
    let subjectSet = assignedByBatch.get(row.batchId);
    if (!subjectSet) {
      subjectSet = new Set();
      assignedByBatch.set(row.batchId, subjectSet);
    }
    subjectSet.add(row.subjectId);

    let mappingList = mappingsByBatch.get(row.batchId);
    if (!mappingList) {
      mappingList = [];
      mappingsByBatch.set(row.batchId, mappingList);
    }
    mappingList.push(row);
  }

  const result = [];

  for (const sess of sessions) {
    const sessionPlain = sess.get ? sess.get({ plain: true }) : sess;
    const course = sessionPlain.course;
    if (!course) continue;

    const durationYears = resolveDurationYears(course);

    const nest = {
      courseId: course.courseId,
      sessionId: sessionPlain.sessionId,
      activeBatchYear,
      course: {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        termType: course.termType,
        totalTerms: course.totalTerms,
        courseDuration: course.courseDuration,
        durationYears,
      },
      session: {
        sessionId: sessionPlain.sessionId,
        sessionName: sessionPlain.sessionName,
      },
      batches: [],
    };

    for (const batch of sessionPlain.batches || []) {
      const batchYear = Number(batch.batch);
      const batchEndYear = decimalGreaterThan(durationYears, 0)
        ? toIntegerNumber(decimalAdd(batchYear, durationYears))
        : null;

      const currMapping = batch.curriculumMappings?.[0] || null;
      let subjectIds = [];
      let curriculumData = null;
      let curriculumBatchMappingId = null;
      let curriculumId = null;

      if (currMapping) {
        curriculumBatchMappingId = currMapping.curriculumBatchMappingId;
        curriculumId = currMapping.curriculumId;
        if (currMapping.curriculum) {
          curriculumData = {
            curriculumId: currMapping.curriculum.curriculumId,
            name: currMapping.curriculum.name,
          };
          subjectIds = collectBatchSubjectIds(currMapping);
        }
      }

      const assignedSet = assignedByBatch.get(batch.batchId);
      let assignedSubjects = 0;
      if (assignedSet && subjectIds.length > 0) {
        for (const subjectId of subjectIds) {
          if (assignedSet.has(subjectId)) {
            assignedSubjects = decimalAdd(assignedSubjects, 1);
          }
        }
      }

      const regMapping = batch.regulationBatchMappings?.[0] || null;
      const reg = regMapping?.academicRegulation || null;

      const position = resolveBatchCurrentPosition({
        batchYear,
        course,
        activeCalendarYear: activeBatchYear,
      });

      const batchMappings = mappingsByBatch.get(batch.batchId) || [];
      const hasAssignments =
        subjectIds.length > 0 &&
        decimalGreaterThanOrEqual(assignedSubjects, subjectIds.length);
      const isBatchFrozen =
        batchMappings.length > 0 &&
        batchMappings.every((m) => Boolean(m.isFrozen));
      const publishStatus = isBatchFrozen ? "Published" : "Draft";

      nest.batches.push({
        batchId: batch.batchId,
        batch: batchYear,
        batchEndYear,
        batchName: buildBatchName(batchYear, batchEndYear),
        status: batch.status,
        publishStatus,
        isFrozen: isBatchFrozen,
        intakeCapacity: batch.intakeCapacity ?? null,
        classSections: batch.classSections || [],
        curriculumBatchMappingId,
        curriculumId,
        curriculum: curriculumData,
        academicRegulationId: reg?.academicRegulationId || null,
        academicRegulation: reg
          ? {
              academicRegulationId: reg.academicRegulationId,
              regulationCode: reg.regulationCode,
              regulationName: reg.regulationName,
              assessmentSchemes: reg.assessmentSchemes || [],
            }
          : null,
        totalSubjects: subjectIds.length,
        assignedSubjects,
        assignmentStatus: buildAssignmentStatus(
          subjectIds.length,
          assignedSubjects,
        ),
        currentYear: position.currentYear,
        currentYearLabel: position.currentYearLabel,
        currentTerms: position.currentTerms,
        currentTermsLabel: position.currentTermsLabel,
        currentPositionLabel: position.currentPositionLabel,
      });
    }

    nest.batches.sort((a, b) => decimalCompare(b.batch, a.batch));
    result.push(nest);
  }

  result.sort((a, b) => {
    if (a.course.courseName < b.course.courseName) return -1;
    if (a.course.courseName > b.course.courseName) return 1;
    return decimalCompare(a.sessionId, b.sessionId);
  });

  return result;
}

export async function createAssessmentPlan({ payload, user }) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_CREATE, async ({ transaction: t }) => {
    const academicYearId =
      getAcademicYearId() ||
      (user?.academicYearId ? Number(user.academicYearId) : null);

    const schemeId =
      payload.academicRegulationAssesmentSchemeId ||
      payload.assesmentSchemeId ||
      payload.assessmentSchemeId;

    let scheme = null;
    if (schemeId) {
      scheme = await model.academicRegulationAssesmentSchemeModel.findOne({
        where: { id: Number(schemeId) },
        transaction: t,
      });
      if (!scheme) {
        const error = new Error(`Assessment scheme with ID ${schemeId} not found`);
        error.statusCode = 404;
        throw error;
      }
    }

    const planData = {
      ...payload,
      batchId: payload.batchId ? Number(payload.batchId) : null,
      regulationId: payload.regulationId
        ? Number(payload.regulationId)
        : (scheme?.academicRegulationId ? Number(scheme.academicRegulationId) : null),
      academicRegulationAssesmentSchemeId: scheme ? Number(scheme.id) : null,
      gradingId: payload.gradingId
        ? Number(payload.gradingId)
        : (scheme?.gradingSchemeId ? Number(scheme.gradingSchemeId) : null),
      academicYearId,
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
      status: payload.status || "Draft",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    };

    delete planData.term;
    delete planData.sessionId;
    delete planData.assesmentSchemeId;
    delete planData.assessmentSchemeId;

    return await assessmentPlanRepo.createAssessmentPlan(planData, {
      transaction: t,
    });
  });
}

export async function getAssessmentPlans(queryParams) {
  return await assessmentPlanRepo.getAssessmentPlans(queryParams);
}

export async function getAssessmentPlanById(assessmentPlanId) {
  const plan = await assessmentPlanRepo.getAssessmentPlanById(assessmentPlanId);
  if (!plan) {
    const error = new Error("Assessment plan not found");
    error.statusCode = 404;
    throw error;
  }
  return plan;
}

export async function updateAssessmentPlan({
  assessmentPlanId,
  payload,
  user,
}) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_UPDATE, async ({ transaction: t }) => {
    const existing = await assessmentPlanRepo.getAssessmentPlanById(
      assessmentPlanId,
      { transaction: t },
    );
    if (!existing) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }

    const updateData = {
      ...payload,
      updatedBy: user?.userId || null,
    };

    const schemeId =
      payload.academicRegulationAssesmentSchemeId !== undefined
        ? payload.academicRegulationAssesmentSchemeId
        : (payload.assesmentSchemeId !== undefined
            ? payload.assesmentSchemeId
            : payload.assessmentSchemeId);

    if (schemeId !== undefined) {
      if (schemeId) {
        const scheme = await model.academicRegulationAssesmentSchemeModel.findOne({
          where: { id: Number(schemeId) },
          transaction: t,
        });
        if (!scheme) {
          const error = new Error(`Assessment scheme with ID ${schemeId} not found`);
          error.statusCode = 404;
          throw error;
        }
        updateData.academicRegulationAssesmentSchemeId = Number(scheme.id);
        if (payload.regulationId === undefined && !updateData.regulationId && scheme.academicRegulationId) {
          updateData.regulationId = Number(scheme.academicRegulationId);
        }
        if (payload.gradingId === undefined && scheme.gradingSchemeId) {
          updateData.gradingId = Number(scheme.gradingSchemeId);
        }
      } else {
        updateData.academicRegulationAssesmentSchemeId = null;
      }
    }

    if (payload.batchId !== undefined)
      updateData.batchId = payload.batchId ? Number(payload.batchId) : null;
    if (payload.regulationId !== undefined)
      updateData.regulationId = payload.regulationId
        ? Number(payload.regulationId)
        : null;

    delete updateData.term;
    delete updateData.sessionId;
    delete updateData.academicYearId;
    delete updateData.assesmentSchemeId;
    delete updateData.assessmentSchemeId;

    return await assessmentPlanRepo.updateAssessmentPlan(
      assessmentPlanId,
      updateData,
      { transaction: t },
    );
  });
}

export async function deleteAssessmentPlan(assessmentPlanId) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_DELETE, async ({ transaction: t }) => {
    const blockingSchedule =
      await assessmentPlanRepo.findBlockingExamScheduleForAssessmentPlan(
        assessmentPlanId,
        { transaction: t },
      );
    if (blockingSchedule) {
      const error = new Error(
        "Cannot delete assessment plan because an examination session exists for its exam setup type and exam schedules already exist for mapped subjects.",
      );
      error.statusCode = 400;
      throw error;
    }

    const result = await assessmentPlanRepo.deleteAssessmentPlan(
      assessmentPlanId,
      { transaction: t },
    );
    if (!result) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }
    return result;
  });
}

export async function createAssessmentPlanComponent({ payload, user }) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_COMPONENT_CREATE, async ({ transaction: t }) => {
    const componentData = {
      ...payload,
      assessmentPlanId: Number(payload.assessmentPlanId),
      academicYearId: payload.academicYearId
        ? Number(payload.academicYearId)
        : user?.academicYearId || null,
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    return await assessmentPlanRepo.createAssessmentPlanComponent(
      componentData,
      { transaction: t },
    );
  });
}

export async function updateAssessmentPlanComponent({
  assessmentPlanComponentId,
  payload,
  user,
}) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_COMPONENT_UPDATE, async ({ transaction: t }) => {
    const updateData = {
      ...payload,
      updatedBy: user?.userId || null,
    };

    const updated = await assessmentPlanRepo.updateAssessmentPlanComponent(
      assessmentPlanComponentId,
      updateData,
      { transaction: t },
    );
    if (!updated) {
      const error = new Error("Assessment plan component not found");
      error.statusCode = 404;
      throw error;
    }
    return updated;
  });
}

export async function deleteAssessmentPlanComponent(assessmentPlanComponentId) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_COMPONENT_DELETE, async ({ transaction: t }) => {
    const result = await assessmentPlanRepo.deleteAssessmentPlanComponent(
      assessmentPlanComponentId,
      { transaction: t },
    );
    if (!result) {
      const error = new Error("Assessment plan component not found");
      error.statusCode = 404;
      throw error;
    }
    return result;
  });
}

export async function getCourseAssessmentPlanOverview(queryParams = {}) {
  const {
    curriculumBatchMappingId,
    batchId,
    subjectId,
    assessmentPlanId,
    academicRegulationId,
    assignmentStatus = "all",
    status,
    term,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  const parsedCurriculumBatchMappingId = parsePositiveId(
    curriculumBatchMappingId,
  );
  const parsedBatchId = parsePositiveId(batchId);
  if (
    parsedCurriculumBatchMappingId === undefined &&
    parsedBatchId === undefined
  ) {
    const err = new Error("batchId or curriculumBatchMappingId is required");
    err.statusCode = 400;
    throw err;
  }

  const subjectTermWhere = {};
  const parsedSubjectId = parsePositiveId(subjectId);
  const parsedTerm = parsePositiveId(term);
  if (parsedSubjectId !== undefined)
    subjectTermWhere.subjectId = parsedSubjectId;
  if (parsedTerm !== undefined) subjectTermWhere.term = parsedTerm;

  const subjectWhere = {};
  if (search) {
    subjectWhere[Op.or] = [
      { subjectName: { [Op.like]: `%${search}%` } },
      { subjectCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const mappingWhere = {};
  const parsedAssessmentPlanId = parsePositiveId(assessmentPlanId);
  const parsedCurriculumSubjectTermMappingId = parsePositiveId(
    queryParams.curriculumSubjectTermMappingId,
  );
  if (parsedAssessmentPlanId !== undefined) {
    mappingWhere.assessmentPlanId = parsedAssessmentPlanId;
  }
  if (parsedCurriculumSubjectTermMappingId !== undefined) {
    mappingWhere.curriculumSubjectTermMappingId =
      parsedCurriculumSubjectTermMappingId;
  }

  const planWhere = {};
  const parsedAcademicRegulationId = parsePositiveId(academicRegulationId);
  if (parsedAcademicRegulationId !== undefined) {
    planWhere.regulationId = parsedAcademicRegulationId;
  }

  let mappingRequired = false;
  if (assignmentStatus === "assigned") {
    mappingRequired = true;
  }
  if (assignmentStatus === "unassigned") {
    subjectWhere[
      "$assessmentPlanMappings.assessment_plan_subject_mapping_id$"
    ] = null;
  }

  const { activeBatchYear } = await resolveActiveAcademicYearContext();
  const effectiveLimit = queryParams.pageSize || limit || 10;

  const result =
    await assessmentPlanRepo.findOverviewByCurriculumBatchMappingId({
      curriculumBatchMappingId: parsedCurriculumBatchMappingId,
      batchId: parsedBatchId,
      subjectTermWhere,
      subjectWhere,
      mappingWhere,
      planWhere,
      mappingRequired,
      yearStatus: status,
      activeBatchYear,
      page,
      limit: effectiveLimit,
    });

  if (!result) {
    const err = new Error("Curriculum batch mapping not found");
    err.statusCode = 404;
    throw err;
  }
  const effectiveBatchId = result.batchMapping?.batchId || parsedBatchId;
  const batchMappings = effectiveBatchId
    ? await assessmentPlanRepo.findAssignedSubjectMappings([effectiveBatchId])
    : [];

  const overview = buildOverviewSubjects(
    result.batchMapping,
    result.rows,
    activeBatchYear,
    batchMappings,
  );

  return {
    totalRecords: result.totalRecords,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    pageSize: result.pageSize,
    ...overview,
  };
}

export async function getAssessmentPlanStats() {
  const { subjects, mappings, plans } =
    await assessmentPlanRepo.getAssessmentPlanStatsData();

  const assignedSubjectIds = new Set();
  for (const mapping of mappings) {
    assignedSubjectIds.add(mapping.subjectId);
  }

  let assignedSubjects = 0;
  let unassignedSubjects = 0;
  for (const subject of subjects) {
    if (assignedSubjectIds.has(subject.subjectId)) {
      assignedSubjects = decimalAdd(assignedSubjects, 1);
    } else {
      unassignedSubjects = decimalAdd(unassignedSubjects, 1);
    }
  }

  let overriddenSubjects = 0;
  for (const plan of plans) {
    if (plan.status === "Draft" || plan.isActive === false) {
      overriddenSubjects = decimalAdd(overriddenSubjects, 1);
    }
  }

  const totalSubjects = subjects.length;

  return {
    totalSubjects,
    assignedSubjects,
    unassignedSubjects,
    overriddenSubjects,
    coveragePercentage: decimalGreaterThan(totalSubjects, 0)
      ? decimalMultiply(decimalDivide(assignedSubjects, totalSubjects), 100)
      : 0,
  };
}

export async function createAssessmentPlanSubjectMapping({ payload, user }) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_SUBJECT_MAP, async ({ transaction: t }) => {
    const plan = await assessmentPlanRepo.findPlanForMapping(
      payload.assessmentPlanId,
      { transaction: t },
    );
    if (!plan) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }

    if (!plan.isActive) {
      const error = new Error("Cannot map an inactive assessment plan.");
      error.statusCode = 400;
      throw error;
    }

    const batchRecord = await assessmentPlanRepo.findBatchForMapping(
      payload.batchId,
      { transaction: t },
    );
    if (!batchRecord) {
      const error = new Error(`Batch (ID: ${payload.batchId}) does not exist`);
      error.statusCode = 404;
      throw error;
    }

    const cstmRecord =
      await assessmentPlanRepo.findCurriculumSubjectTermMappingForMapping(
        payload.curriculumSubjectTermMappingId,
        { transaction: t },
      );
    if (!cstmRecord) {
      const error = new Error(
        `Curriculum subject term mapping (ID: ${payload.curriculumSubjectTermMappingId}) does not exist`,
      );
      error.statusCode = 404;
      throw error;
    }

    const courseId =
      batchRecord.session?.courseId || cstmRecord.curriculum?.courseId || null;
    const sessionId = batchRecord.sessionId || null;

    if (
      plan.batchId &&
      payload.batchId &&
      Number(plan.batchId) !== Number(payload.batchId)
    ) {
      const error = new Error(
        `Assessment Plan (ID: ${payload.assessmentPlanId}) is created for Batch (ID: ${plan.batchId}), which does not match Mapping Batch (ID: ${payload.batchId})`,
      );
      error.statusCode = 400;
      throw error;
    }

    const universityId = user?.universityId
      ? Number(user.universityId)
      : plan.universityId
        ? Number(plan.universityId)
        : null;
    const instituteId = user?.instituteId
      ? Number(user.instituteId)
      : plan.instituteId
        ? Number(plan.instituteId)
        : null;

    const existingMapping = await assessmentPlanRepo.findExistingSubjectMapping(
      {
        batchId: Number(payload.batchId),
        curriculumSubjectTermMappingId: Number(
          payload.curriculumSubjectTermMappingId,
        ),
        universityId,
        instituteId,
      },
      { transaction: t },
    );

    const data = {
      assessmentPlanId: Number(payload.assessmentPlanId),
      batchId: Number(payload.batchId),
      curriculumSubjectTermMappingId: Number(
        payload.curriculumSubjectTermMappingId,
      ),
      subjectId: Number(payload.subjectId || cstmRecord.subjectId),
      isFrozen: false,
      universityId,
      instituteId,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    if (existingMapping) {
      if (existingMapping.deletedAt) {
        await existingMapping.restore({ transaction: t });
        await existingMapping.update(data, { transaction: t });
        return await assessmentPlanRepo.reloadSubjectMapping(
          existingMapping.assessmentPlanSubjectMappingId,
          { transaction: t },
        );
      }

      if (
        Number(existingMapping.assessmentPlanId) ===
        Number(payload.assessmentPlanId)
      ) {
        return await assessmentPlanRepo.reloadSubjectMapping(
          existingMapping.assessmentPlanSubjectMappingId,
          { transaction: t },
        );
      }

      // Reassigning to a different plan:
      // Check if existing mapping is frozen
      if (existingMapping.isFrozen) {
        const blockingSchedule =
          await assessmentPlanRepo.findBlockingExamScheduleForSubjectMapping(
            existingMapping,
            { transaction: t },
          );
        if (blockingSchedule) {
          const error = new Error(
            "Cannot change assessment plan because an examination schedule already exists for this subject.",
          );
          error.statusCode = 400;
          throw error;
        }

        const error = new Error(
          "Assessment plan assignment for this subject is frozen. Unfreeze to change the applied plan.",
        );
        error.statusCode = 400;
        throw error;
      }

      await existingMapping.update(
        {
          assessmentPlanId: Number(payload.assessmentPlanId),
          subjectId: Number(payload.subjectId || cstmRecord.subjectId),
          updatedBy: user?.userId || null,
        },
        { transaction: t },
      );

      return await assessmentPlanRepo.reloadSubjectMapping(
        existingMapping.assessmentPlanSubjectMappingId,
        { transaction: t },
      );
    }

    return await assessmentPlanRepo.createAssessmentPlanSubjectMapping(data, {
      transaction: t,
    });
  });
}

export async function getAssessmentPlanSubjectMappings(queryParams) {
  return await assessmentPlanRepo.getAssessmentPlanSubjectMappings(queryParams);
}

export async function deleteAssessmentPlanSubjectMapping(mappingId) {
  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_SUBJECT_UNMAP, async ({ transaction: t }) => {
    const mapping =
      await assessmentPlanRepo.findAssessmentPlanSubjectMappingById(mappingId, {
        transaction: t,
      });
    if (!mapping) {
      const error = new Error("Subject assessment plan mapping not found");
      error.statusCode = 404;
      throw error;
    }

    if (mapping.isFrozen) {
      const error = new Error(
        "Cannot unmap subject because assessment plan choices for this batch are frozen. Revert to draft/unfreeze first.",
      );
      error.statusCode = 400;
      throw error;
    }

    const blockingSchedule =
      await assessmentPlanRepo.findBlockingExamScheduleForSubjectMapping(
        mapping,
        { transaction: t },
      );
    if (blockingSchedule) {
      const error = new Error(
        "Cannot unmap subject because an examination session exists for this assessment plan's exam setup type and an exam schedule already exists for this subject.",
      );
      error.statusCode = 400;
      throw error;
    }

    return await assessmentPlanRepo.deleteAssessmentPlanSubjectMapping(
      mappingId,
      { transaction: t },
    );
  });
}

export async function getBatchCoursesWithSessions(query = {}) {
  const { courseId } = query;

  const courseWhere = {};
  const parsedCourseId = parsePositiveId(courseId);
  if (parsedCourseId !== undefined) {
    courseWhere.courseId = parsedCourseId;
  }

  const { activeBatchYear } = await resolveActiveAcademicYearContext();

  const sessions =
    await assessmentPlanRepo.findCurriculumBatchCoursesWithSessions({
      batchWhere: { batch: { [Op.lte]: activeBatchYear } },
      courseWhere,
    });

  const batchIds = collectBatchIds(sessions);
  const assignedRows =
    await assessmentPlanRepo.findAssignedSubjectMappings(batchIds);

  return nestBatchCoursesWithSessions(sessions, assignedRows, activeBatchYear);
}

export async function getMappedAssessmentTypes(queryParams = {}) {
  const {
    assessmentType,
    batchId,
    courseId,
    term,
    subjectId,
    search,
  } = queryParams;

  return await assessmentPlanRepo.getMappedAssessmentTypes({
    assessmentType,
    batchId: parsePositiveId(batchId),
    courseId: parsePositiveId(courseId),
    term: parsePositiveId(term),
    subjectId: parsePositiveId(subjectId),
    search: search ? String(search).trim() : undefined,
  });
}

export async function publishBatchAssessmentPlans({ batchId, user }) {
  const parsedBatchId = parsePositiveId(batchId);
  if (!parsedBatchId) {
    const error = new Error("batchId is required");
    error.statusCode = 400;
    throw error;
  }

  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_BATCH_PUBLISH, async ({ transaction: t }) => {
    const batch = await assessmentPlanRepo.findBatchForMapping(parsedBatchId, {
      transaction: t,
    });
    if (!batch) {
      const error = new Error(`Batch (ID: ${parsedBatchId}) does not exist`);
      error.statusCode = 404;
      throw error;
    }

    const mappings =
      await assessmentPlanRepo.findBatchSubjectMappingsWithPlans(
        parsedBatchId,
        { transaction: t },
      );

    if (!mappings || mappings.length === 0) {
      const error = new Error(
        "No assessment plans have been assigned to subjects for this batch yet. Assign plans before publishing.",
      );
      error.statusCode = 400;
      throw error;
    }

    const planMap = new Map();
    for (const m of mappings) {
      if (m.assessmentPlan) {
        planMap.set(m.assessmentPlan.assessmentPlanId, m.assessmentPlan);
      }
    }

    if (planMap.size === 0) {
      const error = new Error("No valid assessment plans found for this batch.");
      error.statusCode = 400;
      throw error;
    }

    // Validate each plan: must have components and total weightage == 100
    for (const [planId, plan] of planMap.entries()) {
      const components = plan.components || [];
      if (components.length === 0) {
        const error = new Error(
          `Assessment plan "${plan.planName}" (ID: ${planId}) has no components defined. Total weightage must be 100%.`,
        );
        error.statusCode = 400;
        throw error;
      }

      let totalWeightage = 0;
      for (const comp of components) {
        totalWeightage = decimalAdd(
          totalWeightage,
          comp.weightagePercentage || 0,
        );
      }

      if (decimalCompare(totalWeightage, 100) !== 0) {
        const error = new Error(
          `Assessment plan "${plan.planName}" total weightage must be 100% (currently ${totalWeightage}%).`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // 1. Freeze all subject mappings for this batch
    await assessmentPlanRepo.freezeSubjectMappingsByBatchId(
      parsedBatchId,
      user?.userId || null,
      { transaction: t },
    );

    // 2. Publish the mapped plans
    const planIds = Array.from(planMap.keys());
    await assessmentPlanRepo.publishAssessmentPlansByIds(
      planIds,
      user?.userId || null,
      { transaction: t },
    );

    return {
      message: "Assessment plans published and choices frozen successfully",
      batchId: parsedBatchId,
      publishedPlansCount: planIds.length,
      assignedSubjectsCount: mappings.length,
      isFrozen: true,
      publishStatus: "Published",
    };
  });
}

export async function unfreezeBatchAssessmentPlans({ batchId, user }) {
  const parsedBatchId = parsePositiveId(batchId);
  if (!parsedBatchId) {
    const error = new Error("batchId is required");
    error.statusCode = 400;
    throw error;
  }

  return await withAuditEvent(AUDIT_EVENTS.ASSESSMENT_PLAN_BATCH_UNFREEZE, async ({ transaction: t }) => {
    const blocking = await assessmentPlanRepo.findBlockingExamScheduleForBatch(
      parsedBatchId,
      { transaction: t },
    );
    if (blocking) {
      const error = new Error(
        "Cannot unfreeze assessment plans because an examination schedule already exists for this batch.",
      );
      error.statusCode = 400;
      throw error;
    }

    const mappings =
      await assessmentPlanRepo.findBatchSubjectMappingsWithPlans(
        parsedBatchId,
        { transaction: t },
      );
    if (!mappings || mappings.length === 0) {
      const error = new Error("No assessment plans found for this batch.");
      error.statusCode = 400;
      throw error;
    }

    const planIds = Array.from(
      new Set(
        mappings
          .filter((m) => m.assessmentPlanId)
          .map((m) => m.assessmentPlanId),
      ),
    );

    // 1. Unfreeze all subject mappings for this batch
    await assessmentPlanRepo.unfreezeSubjectMappingsByBatchId(
      parsedBatchId,
      user?.userId || null,
      { transaction: t },
    );

    // 2. Revert mapped plans to draft
    if (planIds.length > 0) {
      await assessmentPlanRepo.unfreezeAssessmentPlansByIds(
        planIds,
        user?.userId || null,
        { transaction: t },
      );
    }

    return {
      message: "Assessment plans reverted to draft successfully",
      batchId: parsedBatchId,
      isFrozen: false,
      publishStatus: "Draft",
    };
  });
}
