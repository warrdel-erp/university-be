import * as repo from '../repository/batchRepository.js';
import * as model from '../models/index.js';
import { resolveActiveAcademicYearContext } from '../utility/curriculumSubjectsByActiveYear.js';
import {
  buildTermName,
  monthsPerTermFromTermType,
  resolveTotalTerms,
  termsForYear,
  termsPerYear,
} from '../utility/courseTerms.js';

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function formatAcademicYearLabel(calendarYear) {
  const start = Number(calendarYear);
  return `${start}-${String(start + 1).slice(-2)}`;
}

function resolveCurrentTermSlotInYear({ startingDate, termType, perYear, referenceDate }) {
  const start = new Date(startingDate);
  const monthsElapsed =
    (referenceDate.getFullYear() - start.getFullYear()) * 12 +
    (referenceDate.getMonth() - start.getMonth());
  const safeMonths = monthsElapsed < 0 ? 0 : monthsElapsed;
  const monthsPerTerm = monthsPerTermFromTermType(termType);
  const slot = Math.floor(safeMonths / monthsPerTerm);
  if (slot < 0) return 0;
  if (slot >= perYear) return perYear - 1;
  return slot;
}

/**
 * List all sessions with their batches, grouped by session.
 * Returns an array of session objects, each with a `batches` array.
 */
export async function getAllBatches(filters = {}) {
  const rows = await repo.findAll(filters);

  return rows.map((row) => {
    const plain = row.get ? row.get({ plain: true }) : row;
    return {
      sessionId: plain.sessionId,
      sessionName: plain.sessionName,
      course: plain.course,
      batches: plain.batches || [],
    };
  });
}

/**
 * Get a single batch by ID.
 */
export async function getBatch(id) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);
  return batch;
}

function resolveConfigStatus(configured, total) {
  if (configured <= 0) return 'Not Started';
  if (total > 0 && configured >= total) return 'Completed';
  return 'In Progress';
}

/**
 * Full batch setup payload: current year, course, session + config summaries
 * for curriculum, assessment plan, regulation, and class sections (counts only).
 */
export async function getBatchFullDetails(batchId) {
  const resolvedBatchId = Number(batchId);

  const [batchRow, academicCtx] = await Promise.all([
    repo.findFullDetailsById(resolvedBatchId),
    resolveActiveAcademicYearContext(),
  ]);

  if (!batchRow) {
    httpError(`Batch (ID: ${resolvedBatchId}) not found`, 404);
  }

  const batch = batchRow.get({ plain: true });
  const session = batch.session;
  if (!session || !session.course) {
    httpError(`Batch (ID: ${resolvedBatchId}) is missing session or course`, 400);
  }
  const course = session.course;

  const batchYear = Number(batch.batch);
  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const academicYear = academicCtx.academicYear.get
    ? academicCtx.academicYear.get({ plain: true })
    : academicCtx.academicYear;
  const currentYearNumber = activeCalendarYear - batchYear + 1;
  const duration = Number(course.courseDuration) || 0;
  const totalTerms = resolveTotalTerms(course);
  const totalYears = duration > 0 ? duration : 0;
  const perYear = termsPerYear(course);

  const expectedTermsInCurrentYear =
    currentYearNumber >= 1 && currentYearNumber <= duration
      ? termsForYear(currentYearNumber, course)
      : [];

  const currentTerms = [];
  for (const termNumber of expectedTermsInCurrentYear) {
    currentTerms.push({
      term: termNumber,
      termName: buildTermName(course.termType, termNumber),
      year: currentYearNumber,
      academicYear: formatAcademicYearLabel(activeCalendarYear),
    });
  }

  let currentTerm = null;
  if (currentTerms.length > 0) {
    const slot = resolveCurrentTermSlotInYear({
      startingDate: academicYear.startingDate,
      termType: course.termType,
      perYear,
      referenceDate: new Date(),
    });
    const clampedSlot = slot < currentTerms.length ? slot : currentTerms.length - 1;
    currentTerm = currentTerms[clampedSlot];
  }

  const curriculumMapping = (batch.curriculumMappings || [])[0] || null;
  const curriculumRow = curriculumMapping ? curriculumMapping.curriculum : null;

  const configuredTermSet = new Set();
  const curriculumSubjectSet = new Set();
  const curriculumBatchTermMappingIds = [];

  if (curriculumMapping) {
    for (const termRow of curriculumMapping.termMappings || []) {
      configuredTermSet.add(Number(termRow.term));
      curriculumBatchTermMappingIds.push(Number(termRow.curriculumBatchTermMappingId));
    }
  }
  if (curriculumRow) {
    for (const subjectTerm of curriculumRow.subjectTermMappings || []) {
      configuredTermSet.add(Number(subjectTerm.term));
      curriculumSubjectSet.add(Number(subjectTerm.subjectId));
    }
  }

  const configuredTerms = configuredTermSet.size;
  const remainingTerms = totalTerms > configuredTerms ? totalTerms - configuredTerms : 0;
  const totalSubjects = curriculumSubjectSet.size;

  const assessmentCounts = await repo.countAssessmentPlanSubjectMappingsByBatchContext({
    courseId: course.courseId,
    sessionId: session.sessionId,
    curriculumBatchTermMappingIds,
  });

  const configuredAssessmentSubjects = assessmentCounts.mappedSubjectCount;
  const remainingAssessmentSubjects =
    totalSubjects > configuredAssessmentSubjects
      ? totalSubjects - configuredAssessmentSubjects
      : 0;

  let regulationMapping = null;
  let regulationMappedCount = 0;
  for (const mapping of session.regulationCourseMappings || []) {
    if (Number(mapping.courseId) !== Number(course.courseId)) {
      continue;
    }
    regulationMappedCount += 1;
    if (!regulationMapping) {
      regulationMapping = mapping;
    }
  }

  const configuredYearsSet = new Set();
  let sectionCount = 0;
  for (const section of batch.classSections || []) {
    sectionCount += 1;
    if (section.year != null) {
      configuredYearsSet.add(Number(section.year));
    }
  }
  const configuredYears = configuredYearsSet.size;
  const remainingYears = totalYears > configuredYears ? totalYears - configuredYears : 0;

  const curriculumConfigured = Boolean(curriculumMapping && curriculumRow);
  const assessmentConfigured = configuredAssessmentSubjects > 0;
  const regulationConfigured = regulationMappedCount > 0;
  const classSectionConfigured = sectionCount > 0;

  const regulationPlain = regulationMapping
    ? regulationMapping.academicRegulation
    : null;

  return {
    currentYear: {
      academicCalendarYear: activeCalendarYear,
      academicYear: formatAcademicYearLabel(activeCalendarYear),
      academicYearId: academicCtx.academicYearId,
      yearTitle: academicYear.yearTitle || null,
      yearNumber: currentYearNumber > 0 ? currentYearNumber : null,
      isWithinProgramme: currentYearNumber >= 1 && currentYearNumber <= duration,
      currentTerm,
      currentTerms,
    },
    batch: {
      batchId: Number(batch.batchId),
      batch: batchYear,
      sessionId: Number(batch.sessionId),
      status: batch.status,
      intakeCapacity: batch.intakeCapacity,
      admissionYear: formatAcademicYearLabel(batchYear),
    },
    session: {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      academicYearId: session.academicYearId,
      courseId: session.courseId,
    },
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      courseDuration: course.courseDuration,
      duration,
      totalTerms,
      termType: course.termType,
      isActive: course.isActive,
    },
    curriculum: curriculumConfigured
      ? {
          curriculumId: curriculumRow.curriculumId,
          name: curriculumRow.name,
          publishStatus: curriculumRow.publishStatus,
          isActive: curriculumRow.isActive,
          curriculumBatchMappingId: curriculumMapping.curriculumBatchMappingId,
          batchId: curriculumMapping.batchId,
          configuredTerms,
          totalTerms,
          remainingTerms,
          configuredSubjects: totalSubjects,
          totalSubjects,
          remainingSubjects: 0,
          structure: `${configuredTerms} / ${totalTerms} terms`,
          status: resolveConfigStatus(configuredTerms, totalTerms),
          configured: true,
        }
      : {
          curriculumId: null,
          name: null,
          publishStatus: null,
          isActive: null,
          curriculumBatchMappingId: null,
          batchId: resolvedBatchId,
          configuredTerms: 0,
          totalTerms,
          remainingTerms: totalTerms,
          configuredSubjects: 0,
          totalSubjects: 0,
          remainingSubjects: 0,
          structure: `0 / ${totalTerms} terms`,
          status: 'Not Started',
          configured: false,
        },
    assessmentPlan: {
      mappedPlanCount: assessmentCounts.mappedPlanCount,
      configuredSubjects: configuredAssessmentSubjects,
      totalSubjects,
      remainingSubjects: remainingAssessmentSubjects,
      structure: `${configuredAssessmentSubjects} / ${totalSubjects} subjects`,
      status: resolveConfigStatus(configuredAssessmentSubjects, totalSubjects),
      configured: assessmentConfigured,
    },
    regulation: {
      academicRegulationCourseMappingId: regulationMapping
        ? regulationMapping.academicRegulationCourseMappingId
        : null,
      academicRegulationId: regulationMapping
        ? regulationMapping.academicRegulationId
        : null,
      regulationCode: regulationPlain ? regulationPlain.regulationCode : null,
      regulationName: regulationPlain ? regulationPlain.regulationName : null,
      status: regulationPlain ? regulationPlain.status : null,
      isActive: regulationPlain ? regulationPlain.isActive : null,
      mappedCount: regulationMappedCount,
      configured: regulationConfigured,
      configStatus: regulationConfigured ? 'Configured' : 'Not Started',
    },
    classSection: {
      sectionCount,
      configuredYears,
      totalYears,
      remainingYears,
      structure: `${configuredYears} / ${totalYears} years`,
      status: resolveConfigStatus(configuredYears, totalYears),
      configured: classSectionConfigured,
    },
  };
}

/**
 * Create a new batch in draft state.
 *
 * @param {{ sessionId, batch, intakeCapacity? }} data
 * @param {number} userId
 */
export async function createBatch(data, userId) {
  const { sessionId, batch, intakeCapacity } = data;

  if (!sessionId) httpError('sessionId is required', 400);
  if (!batch) httpError('batch year is required', 400);

  const session = await model.sessionModel.findByPk(Number(sessionId), {
    attributes: ['sessionId'],
  });
  if (!session) httpError(`Session ID ${sessionId} not found`, 404);

  const existing = await model.batchModel.findOne({
    where: { sessionId: Number(sessionId), batch: Number(batch) },
    attributes: ['batchId'],
  });
  if (existing) httpError(`Batch ${batch} is already mapped to this session`, 409);

  return repo.create({
    sessionId: Number(sessionId),
    batch: Number(batch),
    status: 'draft',
    intakeCapacity: intakeCapacity ? Number(intakeCapacity) : null,
    createdBy: userId,
  });
}

/**
 * Publish a batch (draft → published). Once published, core fields are immutable.
 */
export async function publishBatch(id) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);

  if (batch.status === 'published') {
    httpError('Batch is already published', 400);
  }

  const [affected] = await repo.publish(id);
  if (affected === 0) httpError('Failed to publish batch', 500);

  return repo.findById(id);
}

/**
 * Update mutable fields of a batch. Only allowed when status is draft.
 * Fields allowed: intakeCapacity.
 */
export async function updateBatch(id, data) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);

  if (batch.status === 'published') {
    httpError('Cannot update a published batch. Published batches are immutable.', 400);
  }

  const allowed = {};
  if (data.intakeCapacity !== undefined) {
    allowed.intakeCapacity = data.intakeCapacity ? Number(data.intakeCapacity) : null;
  }

  if (Object.keys(allowed).length === 0) {
    httpError('No updatable fields provided', 400);
  }

  return repo.update(id, allowed);
}

/**
 * Delete a batch. Not allowed if:
 * - batch is published
 * - batch has curriculum mappings
 * - batch has class sections
 */
export async function deleteBatch(id) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);

  if (batch.status === 'published') {
    httpError('Cannot delete a published batch. Unpublish it first.', 400);
  }

  const curriculumCount = await repo.countCurriculumMappings(id);
  if (curriculumCount > 0) {
    httpError(
      `Cannot delete this batch: ${curriculumCount} curriculum mapping(s) exist. Remove them first.`,
      400,
    );
  }

  const sectionCount = await repo.countClassSections(id);
  if (sectionCount > 0) {
    httpError(
      `Cannot delete this batch: ${sectionCount} class section(s) are linked. Remove them first.`,
      400,
    );
  }

  await repo.remove(id);
  return { batchId: Number(id), deleted: true };
}

/**
 * Batch students list with basic batch/course/session/curriculum summary + pagination.
 */
export async function getBatchStudents(batchId, query = {}) {
  const resolvedBatchId = Number(batchId);

  const [batchRow, academicCtx, studentPage] = await Promise.all([
    repo.findFullDetailsById(resolvedBatchId),
    resolveActiveAcademicYearContext(),
    repo.findStudentsByBatchId(resolvedBatchId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
    }),
  ]);

  if (!batchRow) {
    httpError(`Batch (ID: ${resolvedBatchId}) not found`, 404);
  }

  const batch = batchRow.get({ plain: true });
  const session = batch.session;
  if (!session || !session.course) {
    httpError(`Batch (ID: ${resolvedBatchId}) is missing session or course`, 400);
  }
  const course = session.course;

  const batchYear = Number(batch.batch);
  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const academicYear = academicCtx.academicYear.get
    ? academicCtx.academicYear.get({ plain: true })
    : academicCtx.academicYear;
  const currentYearNumber = activeCalendarYear - batchYear + 1;
  const duration = Number(course.courseDuration) || 0;
  const perYear = termsPerYear(course);

  const expectedTermsInCurrentYear =
    currentYearNumber >= 1 && currentYearNumber <= duration
      ? termsForYear(currentYearNumber, course)
      : [];

  const currentTerms = [];
  for (const termNumber of expectedTermsInCurrentYear) {
    currentTerms.push({
      term: termNumber,
      termName: buildTermName(course.termType, termNumber),
      year: currentYearNumber,
      academicYear: formatAcademicYearLabel(activeCalendarYear),
    });
  }

  let currentTerm = null;
  if (currentTerms.length > 0) {
    const slot = resolveCurrentTermSlotInYear({
      startingDate: academicYear.startingDate,
      termType: course.termType,
      perYear,
      referenceDate: new Date(),
    });
    const clampedSlot = slot < currentTerms.length ? slot : currentTerms.length - 1;
    currentTerm = currentTerms[clampedSlot];
  }

  const curriculumMapping = (batch.curriculumMappings || [])[0] || null;
  const curriculumRow = curriculumMapping ? curriculumMapping.curriculum : null;

  const curriculumSubjectSet = new Set();
  if (curriculumRow) {
    for (const subjectTerm of curriculumRow.subjectTermMappings || []) {
      curriculumSubjectSet.add(Number(subjectTerm.subjectId));
    }
  }
  const configuredSubjects = curriculumSubjectSet.size;

  const students = [];
  for (const row of studentPage.rows) {
    const plain = row.get({ plain: true });
    const termRow = plain.studentClassSectionTerm || null;
    const section = termRow ? termRow.classSection : null;

    students.push({
      studentId: plain.studentId,
      firstName: plain.firstName,
      middleName: plain.middleName,
      lastName: plain.lastName,
      enrollNumber: plain.enrollNumber,
      scholarNumber: plain.scholarNumber,
      batch: batchYear,
      batchId: Number(plain.batchId),
      term: termRow ? Number(termRow.term) : null,
      classSectionTermId: termRow ? termRow.classSectionTermId : plain.classSectionTermId,
      classSection: section ? section.section : null,
      classSectionsId: section ? section.classSectionsId : null,
      year: section ? section.year : null,
    });
  }

  return {
    data: {
      batch: {
        batchId: Number(batch.batchId),
        batch: batchYear,
        status: batch.status,
        intakeCapacity: batch.intakeCapacity,
        admissionYear: formatAcademicYearLabel(batchYear),
      },
      session: {
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        courseId: session.courseId,
      },
      course: {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        termType: course.termType,
        courseDuration: course.courseDuration,
      },
      curriculum: {
        curriculumId: curriculumRow ? curriculumRow.curriculumId : null,
        name: curriculumRow ? curriculumRow.name : null,
        publishStatus: curriculumRow ? curriculumRow.publishStatus : null,
        configuredSubjects,
        totalSubjects: configuredSubjects,
      },
      currentYear: {
        academicCalendarYear: activeCalendarYear,
        academicYear: formatAcademicYearLabel(activeCalendarYear),
        yearNumber: currentYearNumber > 0 ? currentYearNumber : null,
        currentTerm,
        currentTerms,
      },
      studentCount: studentPage.count,
      students,
    },
    paginationData: {
      page: studentPage.page,
      limit: studentPage.limit,
      total: studentPage.count,
    },
  };
}
