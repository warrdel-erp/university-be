import * as courseRepository from "../repository/courseRepository.js";
import { resolveActiveAcademicYearContext } from "../utility/curriculumSubjectsByActiveYear.js";
import { resolveTotalTerms, termsForYear } from "../utility/courseTerms.js";

export const listCourses = async (options = {}) => {
  return courseRepository.getAllCourses(options);
};

export const getCourseByCourseId = async (courseId) => {
  return courseRepository.getCourseByCourseId(courseId);
};

export const getCourseWithSubjects = async () => {
  return courseRepository.getCourseListWithSubjects();
};

export const getCourseWithSessions = async (courseId) => {
  return courseRepository.getCourseWithSessionsData(courseId);
};

function resolveStructureStatus(configuredTerms, totalTerms) {
  if (configuredTerms <= 0) return "Not Started";
  if (configuredTerms === totalTerms) return "Completed";
  return "In Progress";
}

function countConfiguredTerms(subjectTermMappings) {
  const terms = new Set();
  for (const row of subjectTermMappings || []) {
    terms.add(Number(row.term));
  }
  return terms.size;
}

export const getTermsWithClassSections = async (query) => {
  const batchId = Number(query.batchId);
  const yearFilter = query.year != null ? Number(query.year) : undefined;
  const termFilter = query.term != null ? Number(query.term) : undefined;

  const [batchRow, academicCtx] = await Promise.all([
    courseRepository.findTermsWithClassSectionsByBatchId(batchId, {
      year: yearFilter,
      term: termFilter,
    }),
    resolveActiveAcademicYearContext(),
  ]);

  if (!batchRow) {
    const error = new Error(`Batch (ID: ${batchId}) not found`);
    error.statusCode = 404;
    throw error;
  }

  const batch = batchRow.get({ plain: true });
  const session = batch.session;
  const course = session.course;
  if (!session || !course) {
    const error = new Error(
      `Batch (ID: ${batchId}) is missing session or course`,
    );
    error.statusCode = 400;
    throw error;
  }

  const batchYear = Number(batch.batch);
  const totalTerms = resolveTotalTerms(course);
  const duration = Number(course.courseDuration) || 0;
  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const academicYear = academicCtx.academicYear?.get
    ? academicCtx.academicYear.get({ plain: true })
    : academicCtx.academicYear;
  const currentYearNumber = activeCalendarYear - batchYear + 1;
  const maxYear = duration > 0 ? duration : 1;

  const classSectionsIds = [];
  const sectionsByYear = new Map();
  for (const section of batch.classSections || []) {
    classSectionsIds.push(Number(section.classSectionsId));
    const yearLevel = Number(section.year) || 1;
    let list = sectionsByYear.get(yearLevel);
    if (!list) {
      list = [];
      sectionsByYear.set(yearLevel, list);
    }
    list.push(section);
  }

  const studentCountBySection =
    await courseRepository.countStudentsByClassSectionIds(classSectionsIds);

  const academicRegulations = [];
  for (const mapping of session.regulationCourseMappings || []) {
    if (Number(mapping.courseId) !== Number(course.courseId)) {
      continue;
    }
    const regulation = mapping.academicRegulation;
    academicRegulations.push({
      academicRegulationCourseMappingId:
        mapping.academicRegulationCourseMappingId,
      academicRegulationId: mapping.academicRegulationId,
      regulationCode: regulation.regulationCode,
      regulationName: regulation.regulationName,
      description: regulation.description,
      academicYearRange: regulation.academicYearRange,
      applicableBatch: regulation.applicableBatch,
      effectiveFrom: regulation.effectiveFrom,
      effectiveUntil: regulation.effectiveUntil,
      gradingSchemeId: regulation.gradingSchemeId,
      academicYearId: regulation.academicYearId,
      status: regulation.status,
      isActive: regulation.isActive,
    });
  }

  const curriculumMapping = (batch.curriculumMappings || [])[0] || null;
  const curriculum = curriculumMapping?.curriculum || null;
  const configuredTerms = curriculum
    ? countConfiguredTerms(curriculum.subjectTermMappings)
    : 0;
  const structureStatus = resolveStructureStatus(configuredTerms, totalTerms);

  const years = [];
  for (let year = 1; year <= maxYear; year++) {
    if (yearFilter != null && year !== yearFilter) {
      continue;
    }

    const sections = sectionsByYear.get(year) || [];
    const classSections = [];
    for (const section of sections) {
      const terms = [];
      for (const termRow of section.classSectionTerms || []) {
        terms.push({
          classSectionTermId: termRow.classSectionTermId,
          term: Number(termRow.term),
        });
      }

      classSections.push({
        classSectionsId: section.classSectionsId,
        section: section.section,
        year: Number(section.year),
        expectedCapacity: section.expectedCapacity,
        activeYear: section.activeYear,
        batchId: section.batchId,
        studentCount:
          studentCountBySection.get(Number(section.classSectionsId)) || 0,
        terms,
      });
    }

    years.push({
      year,
      activeYear: batchYear + (year - 1),
      isCurrentYear: year === currentYearNumber,
      configured: classSections.length > 0,
      expectedTerms: termsForYear(year, course),
      classSections,
    });
  }

  return {
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      termType: course.termType,
      totalTerms,
      duration: course.courseDuration,
      courseDuration: course.courseDuration,
    },
    session: {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      academicYearId: session.academicYearId,
      courseId: session.courseId,
    },
    academicActiveYear: {
      academicYearId: academicCtx.academicYearId,
      yearTitle: academicYear?.yearTitle || null,
      startingDate: academicYear?.startingDate || null,
      endingDate: academicYear?.endingDate || null,
      activeCalendarYear,
    },
    currentYear: activeCalendarYear,
    filters: {
      batchId,
      year: yearFilter || null,
      term: termFilter || null,
    },
    academicRegulations,
    batch: {
      batchId: Number(batch.batchId),
      batch: batchYear,
      status: batch.status,
      intakeCapacity: batch.intakeCapacity,
      currentYear: currentYearNumber > 0 ? currentYearNumber : null,
      curriculum: curriculum
        ? {
            curriculumId: Number(curriculum.curriculumId),
            sku: curriculum.name,
            name: curriculum.name,
            publishStatus: curriculum.publishStatus,
            isActive: curriculum.isActive,
            curriculumBatchMappingId: Number(
              curriculumMapping.curriculumBatchMappingId,
            ),
            configuredTerms,
            totalTerms,
            structure: `${configuredTerms} / ${totalTerms} terms`,
            status: structureStatus,
            configured: configuredTerms > 0,
            isConfigured: true,
          }
        : {
            curriculumId: null,
            sku: null,
            name: null,
            publishStatus: null,
            isActive: null,
            curriculumBatchMappingId: null,
            configuredTerms: 0,
            totalTerms,
            structure: `0 / ${totalTerms} terms`,
            status: "Not Started",
            configured: false,
            isConfigured: false,
          },
      years,
    },
  };
};

export const getTermOptionsByCourse = async (courseId) => {
  const course = await courseRepository.getCourseByCourseId(courseId);

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  const termType = course.termType || "Term";
  const totalTerms = course.totalTerms || 0;

  const terms = [];
  for (let i = 1; i <= totalTerms; i++) {
    terms.push({
      termName: `${termType} ${i}`,
      term: i,
    });
  }

  return terms;
};

export const deleteCourse = async (courseId) => {
  const result = await courseRepository.deleteCourseById(courseId);

  if (!result) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  return result;
};

export const getSubjectsByTeacherUserId = async (userId, searchKey, options = {}) => {
  return courseRepository.getSubjectsByTeacherUserId(userId, searchKey, options);
};

export const getSubjectByTeacherUserIdAndSubjectId = async (
  userId,
  subjectId,
) => {
  return courseRepository.getSubjectByTeacherUserIdAndSubjectId(
    userId,
    subjectId,
  );
};
