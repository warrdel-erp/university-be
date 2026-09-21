import * as courseRepository from "../repository/courseRepository.js";

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

export const getTermsWithClassSections = async (courseId, sessionId) => {
  const [course, session, classSections, mappedBatches] = await Promise.all([
    courseRepository.getCourseByCourseId(courseId),
    courseRepository.getSessionSummaryById(sessionId),
    courseRepository.getClassSectionsByCourseAndSession(courseId, sessionId),
    courseRepository.getSessionBatchesMapping(sessionId),
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
  const classSectionsByBatchAndYear = {};
  const duration = Number(coursePlain.courseDuration) || 0;

  // Create a quick lookup for batch numbers from mapping IDs
  const batchMap = {};
  for (const mb of mappedBatches) {
    batchMap[mb.session_batch_mapping_id] = mb.batch;
    if (!classSectionsByBatchAndYear[mb.batch]) {
      classSectionsByBatchAndYear[mb.batch] = {};
    }
  }

  for (const section of classSections) {
    classSectionsIds.push(section.classSectionsId);
    
    // Look up batch by mapping ID, fallback to old activeYear math if missing
    let batch = batchMap[section.sessionBatchMappingId];
    if (!batch) {
       batch = section.activeYear ? (section.activeYear - ((section.year || 1) - 1)) : 2026;
    }
    
    const yearLevel = section.year || 1;
    
    if (!classSectionsByBatchAndYear[batch]) {
      classSectionsByBatchAndYear[batch] = {};
    }
    if (!classSectionsByBatchAndYear[batch][yearLevel]) {
      classSectionsByBatchAndYear[batch][yearLevel] = [];
    }

    classSectionsByBatchAndYear[batch][yearLevel].push({
      classSectionsId: section.classSectionsId,
      section: section.section,
      activeYear: section.activeYear
    });
  }

  const studentCountBySection = await courseRepository.countStudentsByClassSectionIds(classSectionsIds);

  const batches = [];
  const batchKeys = Object.keys(classSectionsByBatchAndYear).map(Number).sort((a, b) => b - a); // Descending batches (newest first)

  for (const batch of batchKeys) {
    const years = [];
    const maxYear = duration > 0 ? duration : Math.max(1, ...Object.keys(classSectionsByBatchAndYear[batch]).map(Number));
    
    for (let year = 1; year <= maxYear; year++) {
      const sections = classSectionsByBatchAndYear[batch][year] || [];
      
      for (const section of sections) {
        section.studentCount = studentCountBySection.get(Number(section.classSectionsId)) ?? 0;
      }
      
      years.push({
        year,
        activeYear: batch + (year - 1), // Compute active year for this slot even if empty
        classSections: sections,
      });
    }
    
    batches.push({
      batch,
      years
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
    batches,
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

export const getSubjectsByTeacherUserId = async (userId, searchKey) => {
  return courseRepository.getSubjectsByTeacherUserId(userId, searchKey);
};

export const getSubjectByTeacherUserIdAndSubjectId = async (userId, subjectId) => {
  return courseRepository.getSubjectByTeacherUserIdAndSubjectId(userId, subjectId);
};
