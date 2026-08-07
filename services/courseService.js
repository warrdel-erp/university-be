import * as courseRepository from "../repository/courseRepository.js";

export const listCourses = async (options = {}) => {
  return courseRepository.getAllCourses(options);
};

export const getCourseByCourseId = async (courseId) => {
  return courseRepository.getCourseByCourseId(courseId);
};

export const getCourseWithSubjects = async (academicYearId) => {
  return courseRepository.getCourseListWithSubjects(academicYearId);
};

export const getCourseWithSessions = async (courseId) => {
  return courseRepository.getCourseWithSessionsData(courseId);
};

export const getTermsWithClassSections = async (courseId, sessionId) => {
  const [course, session, classSections] = await Promise.all([
    courseRepository.getCourseByCourseId(courseId),
    courseRepository.getSessionSummaryById(sessionId),
    courseRepository.getClassSectionsByCourseAndSession(courseId, sessionId),
  ]);

  if (!course) {
    const error = new Error('Course not found');
    error.statusCode = 404;
    throw error;
  }
  if (!session) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }

  const coursePlain = course.get({ plain: true });
  const classSectionsIds = [];
  const classSectionsByYear = {};

  for (const section of classSections) {
    classSectionsIds.push(section.classSectionsId);

    if (!classSectionsByYear[section.year]) {
      classSectionsByYear[section.year] = [];
    }

    classSectionsByYear[section.year].push({
      classSectionsId: section.classSectionsId,
      section: section.section,
    });
  }

  const studentCountBySection = await courseRepository.countStudentsByClassSectionIds(classSectionsIds);

  for (const yearKey of Object.keys(classSectionsByYear)) {
    const sections = classSectionsByYear[yearKey];
    for (let i = 0; i < sections.length; i++) {
      const sectionId = sections[i].classSectionsId;
      sections[i].studentCount = studentCountBySection.get(sectionId) ?? 0;
    }
  }

  const duration = Number(coursePlain.courseDuration) || 0;
  const years = [];

  if (duration > 0) {
    for (let year = 1; year <= duration; year++) {
      years.push({
        year,
        classSections: classSectionsByYear[year] || [],
      });
    }
  } else {
    const yearKeys = Object.keys(classSectionsByYear);
    yearKeys.sort((a, b) => Number(a) - Number(b));

    for (const yearKey of yearKeys) {
      years.push({
        year: Number(yearKey),
        classSections: classSectionsByYear[yearKey],
      });
    }
  }

  return {
    course: {
      courseId: coursePlain.courseId,
      courseName: coursePlain.courseName,
      courseCode: coursePlain.courseCode,
      termType: coursePlain.termType,
      totalTerms: coursePlain.totalTerms,
      duration: coursePlain.courseDuration,
    },
    session: {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
    },
    years,
  };
};

export const getTermOptionsByCourse = async (courseId) => {
  const course = await courseRepository.getCourseByCourseId(courseId);

  if (!course) {
    const error = new Error('Course not found');
    error.statusCode = 404;
    throw error;
  }

  const termType = course.termType || 'Term';
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
    const error = new Error('Course not found');
    error.statusCode = 404;
    throw error;
  }

  return result;
};
