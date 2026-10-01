import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as assessmentPlanRepo from "../repository/assessmentPlanRepository.js";
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

function mapAssessmentPlanMapping(mapping) {
  const plain = mapping.get ? mapping.get({ plain: true }) : mapping;
  const plan = plain.assessmentPlan;

  return {
    assessmentPlanSubjectMappingId: plain.assessmentPlanSubjectMappingId,
    assessmentPlanId: plain.assessmentPlanId,
    batchId: plain.batchId,
    curriculumSubjectTermMappingId: plain.curriculumSubjectTermMappingId,
    subjectId: plain.subjectId,
    assessmentPlan: plan
      ? {
          assessmentPlanId: plan.assessmentPlanId,
          planName: plan.planName,
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
function buildOverviewSubjects(batchMapping, rows, activeBatchYear) {
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

  return {
    curriculumBatchMappingId: batchMapping.curriculumBatchMappingId,
    curriculumId: curriculum.curriculumId,
    batchId: batch?.batchId || null,
    batch: batchYear,
    batchEndYear,
    batchName: buildBatchName(batchYear, batchEndYear),
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
  for (const row of assignedRows) {
    let subjectSet = assignedByBatch.get(row.batchId);
    if (!subjectSet) {
      subjectSet = new Set();
      assignedByBatch.set(row.batchId, subjectSet);
    }
    subjectSet.add(row.subjectId);
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

      nest.batches.push({
        batchId: batch.batchId,
        batch: batchYear,
        batchEndYear,
        batchName: buildBatchName(batchYear, batchEndYear),
        status: batch.status,
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
  return await sequelize.transaction(async (t) => {
    const academicYearId =
      getAcademicYearId() ||
      (user?.academicYearId ? Number(user.academicYearId) : null);

    const planData = {
      ...payload,
      batchId: payload.batchId ? Number(payload.batchId) : null,
      regulationId: payload.regulationId ? Number(payload.regulationId) : null,
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
  return await sequelize.transaction(async (t) => {
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

    if (payload.batchId !== undefined)
      updateData.batchId = payload.batchId ? Number(payload.batchId) : null;
    if (payload.regulationId !== undefined)
      updateData.regulationId = payload.regulationId
        ? Number(payload.regulationId)
        : null;

    delete updateData.term;
    delete updateData.sessionId;
    delete updateData.academicYearId;

    return await assessmentPlanRepo.updateAssessmentPlan(
      assessmentPlanId,
      updateData,
      { transaction: t },
    );
  });
}

export async function deleteAssessmentPlan(assessmentPlanId) {
  return await sequelize.transaction(async (t) => {
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
  return await sequelize.transaction(async (t) => {
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
  return await sequelize.transaction(async (t) => {
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
  return await sequelize.transaction(async (t) => {
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
  const overview = buildOverviewSubjects(
    result.batchMapping,
    result.rows,
    activeBatchYear,
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
  return await sequelize.transaction(async (t) => {
    const plan = await assessmentPlanRepo.findPlanForMapping(
      payload.assessmentPlanId,
      { transaction: t },
    );
    if (!plan) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }

    if (plan.status !== "Published" || !plan.isActive) {
      const error = new Error(
        "Cannot map an assessment plan in Draft status. Plan must be Published.",
      );
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
        assessmentPlanId: Number(payload.assessmentPlanId),
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
      universityId,
      instituteId,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    if (existingMapping) {
      if (existingMapping.deletedAt) {
        await existingMapping.restore({ transaction: t });
        await existingMapping.update(data, { transaction: t });
        return existingMapping;
      }
      const error = new Error(
        "Subject is already mapped to this assessment plan for this batch",
      );
      error.statusCode = 409;
      throw error;
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
  return await sequelize.transaction(async (t) => {
    const mapping =
      await assessmentPlanRepo.findAssessmentPlanSubjectMappingById(mappingId, {
        transaction: t,
      });
    if (!mapping) {
      const error = new Error("Subject assessment plan mapping not found");
      error.statusCode = 404;
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
