import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as assessmentPlanRepo from "../repository/assessmentPlanRepository.js";
import * as acedmicYearRepository from "../repository/acedmicYearRepository.js";
import * as model from "../models/index.js";
import { getAcademicYearId, getTenantStore } from "../utility/requestContext.js";
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
import { resolveTotalTerms, termsPerYear } from "../utility/courseTerms.js";

/**
 * Active academic year from tenant store (academicYearId).
 * Returns academicYearId + calendar year from startingDate (e.g. 2026-07-01 → 2026).
 */
async function resolveActiveAcademicYearContext() {
  let academicYearId = getAcademicYearId();
  let academicYear = null;

  if (academicYearId) {
    academicYear = await acedmicYearRepository.getSingleacedmicYearDetails(
      academicYearId,
    );
  }

  if (!academicYear) {
    const store = getTenantStore();
    const activeYears =
      await acedmicYearRepository.getActiveAcedmicYearByInstitute(
        store.instituteId,
        store.universityId,
      );
    academicYear = activeYears?.[0] || null;
  }

  if (!academicYear?.academicYearId || !academicYear?.startingDate) {
    const err = new Error(
      "Active academic year is required to resolve sessions and batch year",
    );
    err.statusCode = 400;
    throw err;
  }

  const activeBatchYear = toIntegerNumber(
    String(academicYear.startingDate).slice(0, 4),
  );
  if (!decimalGreaterThan(activeBatchYear, 0)) {
    const err = new Error(
      "Unable to resolve active batch year from academic year starting date",
    );
    err.statusCode = 400;
    throw err;
  }

  return {
    academicYearId: toIntegerNumber(academicYear.academicYearId),
    activeBatchYear,
    academicYear,
  };
}

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
  const normalized = String(subjectType || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("elective")) return "elective";
  if (normalized === "core" || normalized.includes("foundation")) return "core";
  return normalized;
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

function mapAssessmentPlanMapping(mapping) {
  const plain = mapping.get ? mapping.get({ plain: true }) : mapping;
  const plan = plain.assessmentPlan;

  return {
    assessmentPlanSubjectMappingId: plain.assessmentPlanSubjectMappingId,
    assessmentPlanId: plain.assessmentPlanId,
    subjectId: plain.subjectId,
    courseId: plain.courseId,
    sessionId: plain.sessionId,
    academicYearId: plain.academicYearId,
    examSetupTypeId: plain.examSetupTypeId,
    session: plain.session || null,
    examSetupType: plain.examSetupType || null,
    assessmentPlan: plan
      ? {
          assessmentPlanId: plan.assessmentPlanId,
          planName: plan.planName,
          planCode: plan.planCode,
          description: plan.description,
          courseId: plan.courseId,
          academicYearId: plan.academicYearId,
          regulationId: plan.regulationId,
          term: plan.term,
          gradingId: plan.gradingId,
          status: plan.status,
          isActive: plan.isActive,
          academicRegulation: plan.academicRegulation || null,
          components: plan.components || [],
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

function nestOverviewByTerm(batchMapping, rows, activeBatchYear) {
  const curriculum = batchMapping.curriculum;
  const course = curriculum.course;
  const durationYears = resolveDurationYears(course);
  const batchEndYear = decimalGreaterThan(durationYears, 0)
    ? toIntegerNumber(decimalAdd(batchMapping.batch, durationYears))
    : null;

  // Seed every term from curriculum_batch_term_mapping (e.g. 1..10)
  const termsByNumber = new Map();
  for (const termMapping of batchMapping.termMappings || []) {
    const term = Number(termMapping.term);
    termsByNumber.set(term, {
      term,
      year: termMapping.year,
      yearNumber: termMapping.yearNumber,
      curriculumBatchTermMappingId: termMapping.curriculumBatchTermMappingId,
      status: resolveSubjectYearStatus(termMapping.year, activeBatchYear),
      subjects: [],
    });
  }

  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const subject = plain.subject;
    if (!subject) continue;

    const term = Number(plain.term);
    let termBucket = termsByNumber.get(term);
    if (!termBucket) {
      termBucket = {
        term,
        year: null,
        yearNumber: null,
        curriculumBatchTermMappingId: null,
        status: null,
        subjects: [],
      };
      termsByNumber.set(term, termBucket);
    }

    const assessmentPlanMappings = [];
    for (const mapping of subject.assessmentPlanMappings || []) {
      assessmentPlanMappings.push(mapAssessmentPlanMapping(mapping));
    }

    termBucket.subjects.push({
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
      year: termBucket.year,
      yearNumber: termBucket.yearNumber,
      status: termBucket.status,
      assignmentStatus:
        assessmentPlanMappings.length > 0 ? "assigned" : "unassigned",
      assessmentPlanMappings,
    });
  }

  const terms = [...termsByNumber.values()];
  terms.sort((a, b) => decimalCompare(a.term, b.term));

  let totalSubjects = 0;
  let assignedSubjects = 0;
  for (const termBucket of terms) {
    for (const subject of termBucket.subjects) {
      totalSubjects = decimalAdd(totalSubjects, 1);
      if (subject.assessmentPlanMappings.length > 0) {
        assignedSubjects = decimalAdd(assignedSubjects, 1);
      }
    }
  }

  return {
    curriculumBatchMappingId: batchMapping.curriculumBatchMappingId,
    curriculumId: curriculum.curriculumId,
    batch: batchMapping.batch,
    batchEndYear,
    batchName: buildBatchName(batchMapping.batch, batchEndYear),
    activeBatchYear,
    curriculum: {
      curriculumId: curriculum.curriculumId,
      name: curriculum.name,
    },
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      termType: course.termType,
      totalTerms: course.totalTerms,
      courseDuration: course.courseDuration,
      durationYears,
    },
    totalSubjects,
    assignedSubjects,
    unassignedSubjects: toIntegerNumber(
      decimalSubtract(totalSubjects, assignedSubjects),
    ),
    terms,
  };
}

/** Whole-batch subjects: subject terms whose term exists on the batch term map. */
function collectBatchSubjectIds(plain) {
  const batchTerms = new Set();
  for (const termMapping of plain.termMappings || []) {
    batchTerms.add(Number(termMapping.term));
  }

  const subjectIds = [];
  const curriculum = plain.curriculum;
  for (const mapping of curriculum.subjectTermMappings || []) {
    if (batchTerms.size > 0 && !batchTerms.has(Number(mapping.term))) {
      continue;
    }
    subjectIds.push(mapping.subjectId);
  }
  return subjectIds;
}

function collectBatchCourseSessionIds(batchMappings) {
  const courseIds = new Set();
  const sessionIds = new Set();
  const subjectIds = new Set();

  for (const bm of batchMappings) {
    const plain = bm.get ? bm.get({ plain: true }) : bm;
    const course = plain.curriculum?.course;
    if (!course) continue;

    for (const subjectId of collectBatchSubjectIds(plain)) {
      subjectIds.add(subjectId);
    }

    for (const scm of course.sessionCourseMappings || []) {
      if (!scm.session) continue;
      courseIds.add(course.courseId);
      sessionIds.add(scm.session.sessionId);
    }
  }

  return {
    courseIds: [...courseIds],
    sessionIds: [...sessionIds],
    subjectIds: [...subjectIds],
  };
}

function nestBatchCoursesWithSessions(batchMappings, assignedRows, activeBatchYear) {
  const assignedByCourseSession = new Map();
  for (const row of assignedRows) {
    const key = `${row.courseId}:${row.sessionId}`;
    let subjectSet = assignedByCourseSession.get(key);
    if (!subjectSet) {
      subjectSet = new Set();
      assignedByCourseSession.set(key, subjectSet);
    }
    subjectSet.add(row.subjectId);
  }

  const nestedByCourseSession = new Map();

  for (const bm of batchMappings) {
    const plain = bm.get ? bm.get({ plain: true }) : bm;
    const curriculum = plain.curriculum;
    const course = curriculum?.course;
    if (!course) continue;

    const subjectIds = collectBatchSubjectIds(plain);
    const durationYears = resolveDurationYears(course);
    const batchEndYear = decimalGreaterThan(durationYears, 0)
      ? toIntegerNumber(decimalAdd(plain.batch, durationYears))
      : null;

    for (const scm of course.sessionCourseMappings || []) {
      const session = scm.session;
      if (!session) continue;

      const nestKey = `${course.courseId}:${session.sessionId}`;
      let nest = nestedByCourseSession.get(nestKey);
      if (!nest) {
        const academicYear = session.sessionAcedmic;
        nest = {
          courseId: course.courseId,
          sessionId: session.sessionId,
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
            sessionId: session.sessionId,
            sessionName: session.sessionName,
            startingDate: session.startingDate,
            endingDate: session.endingDate,
            academicYearId: session.academicYearId,
            academicYear: academicYear
              ? {
                  academicYearId: academicYear.academicYearId,
                  yearTitle: academicYear.yearTitle,
                  startingDate: academicYear.startingDate,
                  endingDate: academicYear.endingDate,
                  isActive: academicYear.isActive,
                }
              : null,
          },
          batches: [],
        };
        nestedByCourseSession.set(nestKey, nest);
      }

      const assignedSet = assignedByCourseSession.get(
        `${course.courseId}:${session.sessionId}`,
      );
      let assignedSubjects = 0;
      if (assignedSet) {
        for (const subjectId of subjectIds) {
          if (assignedSet.has(subjectId)) {
            assignedSubjects = decimalAdd(assignedSubjects, 1);
          }
        }
      }

      nest.batches.push({
        curriculumBatchMappingId: plain.curriculumBatchMappingId,
        curriculumId: plain.curriculumId,
        batch: plain.batch,
        batchEndYear,
        batchName: buildBatchName(plain.batch, batchEndYear),
        curriculum: {
          curriculumId: curriculum.curriculumId,
          name: curriculum.name,
        },
        totalSubjects: subjectIds.length,
        assignedSubjects,
        assignmentStatus: buildAssignmentStatus(
          subjectIds.length,
          assignedSubjects,
        ),
      });
    }
  }

  const result = [...nestedByCourseSession.values()];
  for (const nest of result) {
    nest.batches.sort((a, b) => decimalCompare(b.batch, a.batch));
  }

  result.sort((a, b) => {
    if (a.course.courseName < b.course.courseName) return -1;
    if (a.course.courseName > b.course.courseName) return 1;
    return decimalCompare(a.sessionId, b.sessionId);
  });

  return result;
}

export async function createAssessmentPlan({ payload, user }) {
  return await sequelize.transaction(async (t) => {
    const academicYearId =
      getAcademicYearId() ||
      (user?.academicYearId ? Number(user.academicYearId) : null);

    const planData = {
      ...payload,
      courseId: payload.courseId ? Number(payload.courseId) : null,
      regulationId: payload.regulationId ? Number(payload.regulationId) : null,
      term: payload.term !== undefined && payload.term !== null ? Number(payload.term) : null,
      academicYearId,
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
      status: payload.status || "Draft",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    };

    delete planData.sessionId;

    return await assessmentPlanRepo.createAssessmentPlan(planData, { transaction: t });
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

export async function updateAssessmentPlan({ assessmentPlanId, payload, user }) {
  return await sequelize.transaction(async (t) => {
    const existing = await assessmentPlanRepo.getAssessmentPlanById(assessmentPlanId, { transaction: t });
    if (!existing) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }

    const updateData = {
      ...payload,
      updatedBy: user?.userId || null,
    };

    if (payload.courseId !== undefined) updateData.courseId = payload.courseId ? Number(payload.courseId) : null;
    if (payload.regulationId !== undefined) updateData.regulationId = payload.regulationId ? Number(payload.regulationId) : null;
    if (payload.term !== undefined) updateData.term = payload.term !== null ? Number(payload.term) : null;

    delete updateData.sessionId;
    delete updateData.academicYearId;

    return await assessmentPlanRepo.updateAssessmentPlan(assessmentPlanId, updateData, { transaction: t });
  });
}

export async function deleteAssessmentPlan(assessmentPlanId) {
  return await sequelize.transaction(async (t) => {
    const result = await assessmentPlanRepo.deleteAssessmentPlan(assessmentPlanId, { transaction: t });
    if (!result) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }
    return result;
  });
}

export async function createAssessmentPlanComponent({ payload, user }) {
  return await sequelize.transaction(async (t) => {
    const componentData = {
      ...payload,
      assessmentPlanId: Number(payload.assessmentPlanId),
      academicYearId: payload.academicYearId ? Number(payload.academicYearId) : (user?.academicYearId || null),
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    return await assessmentPlanRepo.createAssessmentPlanComponent(componentData, { transaction: t });
  });
}

export async function updateAssessmentPlanComponent({ assessmentPlanComponentId, payload, user }) {
  return await sequelize.transaction(async (t) => {
    const updateData = {
      ...payload,
      updatedBy: user?.userId || null,
    };

    const updated = await assessmentPlanRepo.updateAssessmentPlanComponent(assessmentPlanComponentId, updateData, { transaction: t });
    if (!updated) {
      const error = new Error("Assessment plan component not found");
      error.statusCode = 404;
      throw error;
    }
    return updated;
  });
}

export async function deleteAssessmentPlanComponent(assessmentPlanComponentId) {
  return await sequelize.transaction(async (t) => {
    const result = await assessmentPlanRepo.deleteAssessmentPlanComponent(assessmentPlanComponentId, { transaction: t });
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
    sessionId,
    subjectId,
    assessmentPlanId,
    academicRegulationId,
    assignmentStatus = "all",
    term,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  const parsedCurriculumBatchMappingId = parsePositiveId(
    curriculumBatchMappingId,
  );
  if (parsedCurriculumBatchMappingId === undefined) {
    const err = new Error("curriculumBatchMappingId is required");
    err.statusCode = 400;
    throw err;
  }

  const subjectTermWhere = {};
  const parsedSubjectId = parsePositiveId(subjectId);
  const parsedTerm = parsePositiveId(term);
  if (parsedSubjectId !== undefined) subjectTermWhere.subjectId = parsedSubjectId;
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
  const parsedSessionId = parsePositiveId(sessionId);
  if (parsedAssessmentPlanId !== undefined) {
    mappingWhere.assessmentPlanId = parsedAssessmentPlanId;
  }
  if (parsedSessionId !== undefined) {
    mappingWhere.sessionId = parsedSessionId;
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

  const result =
    await assessmentPlanRepo.findOverviewByCurriculumBatchMappingId({
      curriculumBatchMappingId: parsedCurriculumBatchMappingId,
      subjectTermWhere,
      subjectWhere,
      mappingWhere,
      planWhere,
      mappingRequired,
      page,
      limit,
    });

  if (!result) {
    const err = new Error("Curriculum batch mapping not found");
    err.statusCode = 404;
    throw err;
  }

  const { activeBatchYear } = await resolveActiveAcademicYearContext();
  const nested = nestOverviewByTerm(
    result.batchMapping,
    result.rows,
    activeBatchYear,
  );

  return {
    totalRecords: result.totalRecords,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    pageSize: result.pageSize,
    ...nested,
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
  return await sequelize.transaction(async (t) => {
    const plan = await model.assessmentPlanModel.findByPk(Number(payload.assessmentPlanId), { transaction: t });
    if (!plan) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }

    if (plan.status !== "Published" || !plan.isActive) {
      const error = new Error("Cannot map an assessment plan in Draft status. Plan must be Published.");
      error.statusCode = 400;
      throw error;
    }

    if (plan.courseId && Number(plan.courseId) !== Number(payload.courseId)) {
      const error = new Error(`Assessment Plan (ID: ${payload.assessmentPlanId}) is created for Course (ID: ${plan.courseId}), which does not match payload Course (ID: ${payload.courseId})`);
      error.statusCode = 400;
      throw error;
    }

    const subjectRecord = await model.subjectModel.findOne({
      where: {
        subjectId: Number(payload.subjectId),
        courseId: Number(payload.courseId),
      },
      attributes: ["subjectId", "courseId", "academicYearId"],
      transaction: t,
    });
    if (!subjectRecord) {
      const error = new Error(`Subject (ID: ${payload.subjectId}) does not belong to Course (ID: ${payload.courseId})`);
      error.statusCode = 400;
      throw error;
    }

    const sessionCourseRecord = await model.sessionCouseMappingModel.findOne({
      where: {
        sessionId: Number(payload.sessionId),
        courseId: Number(payload.courseId),
      },
      transaction: t,
    });
    if (!sessionCourseRecord) {
      const error = new Error(`Session (ID: ${payload.sessionId}) is not mapped to Course (ID: ${payload.courseId})`);
      error.statusCode = 400;
      throw error;
    }

    let sessionId = Number(payload.sessionId);
    const sessionRecord = await model.sessionModel.findByPk(sessionId, {
      attributes: ["sessionId", "academicYearId"],
      transaction: t,
    });
    if (!sessionRecord) {
      const error = new Error(`Session (ID: ${sessionId}) does not exist`);
      error.statusCode = 400;
      throw error;
    }

    if (!plan.academicYearId) {
      const error = new Error(
        `Assessment Plan (ID: ${payload.assessmentPlanId}) has no Academic Year. Cannot create subject mapping.`,
      );
      error.statusCode = 400;
      throw error;
    }

    const academicYearId = Number(plan.academicYearId);

    if (
      !sessionRecord.academicYearId ||
      Number(sessionRecord.academicYearId) !== academicYearId
    ) {
      const error = new Error(
        `Assessment Plan (ID: ${payload.assessmentPlanId}) belongs to Academic Year ID ${academicYearId}, which does not match Session (ID: ${sessionId}) Academic Year ID ${sessionRecord.academicYearId}`,
      );
      error.statusCode = 400;
      throw error;
    }

    let examSetupTypeId = null;
    const component = await model.assessmentPlanComponentModel.findOne({
      where: { assessmentPlanId: Number(payload.assessmentPlanId) },
      attributes: ["examSetupTypeId"],
      raw: true,
      transaction: t,
    });
    if (component && component.examSetupTypeId) {
      examSetupTypeId = Number(component.examSetupTypeId);
      const setupTypeRecord = await model.examSetupTypeModel.findByPk(examSetupTypeId, { transaction: t });
      if (!setupTypeRecord) {
        examSetupTypeId = null;
      }
    }

    const data = {
      assessmentPlanId: Number(payload.assessmentPlanId),
      subjectId: Number(payload.subjectId),
      courseId: Number(payload.courseId),
      sessionId: sessionId,
      academicYearId: academicYearId,
      examSetupTypeId: examSetupTypeId || null,
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };
    return await assessmentPlanRepo.createAssessmentPlanSubjectMapping(data, { transaction: t });
  });
}

export async function getAssessmentPlanSubjectMappings(queryParams) {
  return await assessmentPlanRepo.getAssessmentPlanSubjectMappings(queryParams);
}

export async function deleteAssessmentPlanSubjectMapping(mappingId) {
  return await sequelize.transaction(async (t) => {
    const result = await assessmentPlanRepo.deleteAssessmentPlanSubjectMapping(mappingId, { transaction: t });
    if (!result) {
      const error = new Error("Subject assessment plan mapping not found");
      error.statusCode = 404;
      throw error;
    }
    return result;
  });
}

export async function getBatchCoursesWithSessions(query = {}) {
  const { courseId } = query;

  const curriculumWhere = {};
  const parsedCourseId = parsePositiveId(courseId);
  if (parsedCourseId !== undefined) {
    curriculumWhere.courseId = parsedCourseId;
  }

  const { academicYearId, activeBatchYear } =
    await resolveActiveAcademicYearContext();

  const batchMappings =
    await assessmentPlanRepo.findCurriculumBatchCoursesWithSessions({
      batchWhere: { batch: { [Op.lte]: activeBatchYear } },
      curriculumWhere,
      academicYearId,
    });

  const ids = collectBatchCourseSessionIds(batchMappings);
  const assignedRows = await assessmentPlanRepo.findAssignedSubjectMappings(ids);

  return nestBatchCoursesWithSessions(
    batchMappings,
    assignedRows,
    activeBatchYear,
  );
}
