import * as courseRepository from '../repository/courseRepository.js';

function normalizeTermName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}

function termNamesMatch(left, right) {
  return normalizeTermName(left).toLowerCase() === normalizeTermName(right).toLowerCase();
}

function extractTermNumber(name) {
  const match = String(name ?? '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function resolveSemesterIdForTerm({
  term,
  termName,
  courseId,
  acedmicYearId = null,
  semesters = [],
}) {
  const normalizedTermName = normalizeTermName(termName);

  const courseSemesters = semesters.filter(
    (semester) => Number(semester.courseId) === Number(courseId),
  );

  const pickFromMatches = (matches) => {
    if (!matches.length) return null;
    if (acedmicYearId) {
      const inYear = matches.find(
        (semester) => Number(semester.acedmicYearId) === Number(acedmicYearId),
      );
      if (inYear) return inYear.semesterId;
    }
    return matches[0].semesterId;
  };

  const byExactName = courseSemesters.filter((semester) =>
    termNamesMatch(semester.name, normalizedTermName),
  );
  const exactMatch = pickFromMatches(byExactName);
  if (exactMatch) {
    return exactMatch;
  }

  const byTermNumber = courseSemesters.filter(
    (semester) => extractTermNumber(semester.name) === Number(term),
  );
  const termNumberMatch = pickFromMatches(byTermNumber);
  if (termNumberMatch) {
    return termNumberMatch;
  }

  const byTermIndex = courseSemesters[Number(term) - 1];
  return byTermIndex?.semesterId ?? null;
}
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

export const getCourseWithSessions = async (courseId) => {
  try {
    return await courseRepository.getCourseWithSessionsData(courseId);
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
    const [classSections, semesters, sessionAcedmicYearId] = await Promise.all([
      courseRepository.getClassSectionsByCourseAndSession(courseId, sessionId),
      courseRepository.getSemestersByCourseId(courseId),
      courseRepository.getSessionAcademicYearId(sessionId),
    ]);

    const grouped = [];

    for (let i = 1; i <= (totalTerms || 0); i++) {
      const termName = `${termType} ${i}`;
      const resolvedSemesterId = resolveSemesterIdForTerm({
        term: i,
        termName,
        courseId,
        acedmicYearId: sessionAcedmicYearId,
        semesters,
      });

      const sections = classSections
        .filter((cs) => cs.classGroup && cs.classGroup.term === i)
        .map((cs) => {
          const plain = cs.get ? cs.get({ plain: true }) : cs;
          return {
            name: plain.section,
            id: plain.classSectionsId,
            semesterId: plain.semesterId ?? resolvedSemesterId,
          };
        })
        .filter((section) => section.name != null && section.id != null);

      grouped.push({
        termName,
        term: i,
        semesterId: resolvedSemesterId,
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

export const deleteCourse = async (courseId) => {
  const result = await courseRepository.deleteCourseById(courseId);
  if (!result) {
    const error = new Error('Course not found');
    error.statusCode = 404;
    throw error;
  }
  return result;
};
