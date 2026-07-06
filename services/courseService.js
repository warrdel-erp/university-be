import * as courseRepository from "../repository/courseRepository.js";

export const listCourses = async (options = {}) => {
  return courseRepository.getAllCourses(options);
};

export const getCourseWithSubjects = async (academicYearId) => {
  try {
    return await courseRepository.getCourseListWithSubjects(academicYearId);
  } catch (error) {
    console.error("Error in Course Service (getCourseWithSubjects):", error);
    throw error;
  }
};

export const getCourseWithSessions = async (courseId) => {
  try {
    return await courseRepository.getCourseWithSessionsData(courseId);
  } catch (error) {
    console.error("Error in Course Service (getCourseWithSessions):", error);
    throw error;
  }
};

export const getTermsWithClassSections = async (courseId, sessionId) => {
  const [course, session, classSections] = await Promise.all([
    courseRepository.getCourseSummaryByCourseId(courseId),
    courseRepository.getSessionSummaryById(sessionId),
    courseRepository.getClassSectionsByCourseAndSession(courseId, sessionId),
  ]);

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const totalYears = Number(course.courseDuration) || 0;
  const years = [];

  for (let year = 1; year <= totalYears; year++) {
    years.push({ year, classSections: [] });
  }

  for (const section of classSections) {
    const yearIndex = section.year - 1;
    if (yearIndex < 0 || yearIndex >= totalYears) {
      continue;
    }

    years[yearIndex].classSections.push({
      classSectionsId: section.classSectionsId,
      section: section.section,
    });
  }

  return {
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      termType: course.termType,
      totalTerms: course.totalTerms,
      duration: course.courseDuration,
    },
    session: {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
    },
    years,
  };
};

export const getTermOptionsByCourse = async (courseId) => {
  try {
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
  } catch (error) {
    console.error("Error in Course Service (getTermOptionsByCourse):", error);
    throw error;
  }
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
