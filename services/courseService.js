import * as courseRepository from '../repository/courseRepository.js';

export const listCourses = async (options = {}) => {
  return courseRepository.getAllCourses(options);
};

export const getCourseWithSubjects = async (acedmicYearId) => {
  try {
    return await courseRepository.getCourseListWithSubjects(acedmicYearId);
  } catch (error) {
    console.error('Error in Course Service (getCourseWithSubjects):', error);
    throw error;
  }
};

export const getCourseWithSessions = async (courseId, acedmicYearId, instituteIdFromUser) => {
  try {
    return await courseRepository.getCourseWithSessionsData(
      courseId,
      acedmicYearId,
      instituteIdFromUser
    );
  } catch (error) {
    console.error('Error in Course Service (getCourseWithSessions):', error);
    throw error;
  }
};

export const getClassSectionsGroupedByTerm = async (courseId, sessionId) => {
  try {
    const course = await courseRepository.getCourseByCourseId(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    const { termType, totalTerms } = course;
    const classSections = await courseRepository.getClassSectionsByCourseAndSession(courseId, sessionId);

    const grouped = [];

    for (let i = 1; i <= (totalTerms || 0); i++) {
      const semesterName = `${termType} ${i}`;
      const sections = classSections
        .filter((cs) => cs.classGroup && cs.classGroup.term === i)
        .map((cs) => ({ name: cs.section, id: cs.classSectionsId }))
        .filter(Boolean);

      grouped.push({
        termName: semesterName,
        term: i,
        classSections: sections,
      });
    }

    return grouped;
  } catch (error) {
    console.error('Error in Course Service (getClassSectionsGroupedByTerm):', error);
    throw error;
  }
};

export const getTermOptionsByCourse = async (courseId) => {
  try {
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
  } catch (error) {
    console.error('Error in Course Service (getTermOptionsByCourse):', error);
    throw error;
  }
};
