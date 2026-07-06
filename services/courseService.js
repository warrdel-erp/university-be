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
  try {
    const [course, session, classSections] = await Promise.all([
      courseRepository.getCourseByCourseId(courseId),
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

    const coursePlain = course.get ? course.get({ plain: true }) : course;
    const classSectionsIds = [];
    for (const classSection of classSections) {
      const sectionPlain = classSection.get ? classSection.get({ plain: true }) : classSection;
      classSectionsIds.push(sectionPlain.classSectionsId);
    }

    const studentCountBySection = await courseRepository.countStudentsByClassSectionIds(classSectionsIds);

    const classSectionsByYear = new Map();

    for (const classSection of classSections) {
      const sectionPlain = classSection.get ? classSection.get({ plain: true }) : classSection;
      const year = sectionPlain.year;

      if (!classSectionsByYear.has(year)) {
        classSectionsByYear.set(year, []);
      }

      classSectionsByYear.get(year).push({
        classSectionsId: sectionPlain.classSectionsId,
        section: sectionPlain.section,
        studentCount: studentCountBySection.get(sectionPlain.classSectionsId) ?? 0,
      });
    }

    const years = [];
    for (const [year, sections] of classSectionsByYear) {
      years.push({
        year,
        classSections: sections,
      });
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
  } catch (error) {
    console.error(
      "Error in Course Service (getTermsWithClassSections):",
      error,
    );
    throw error;
  }
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
