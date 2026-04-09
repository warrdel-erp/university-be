import * as courseRepository from '../repository/courseRepository.js';

/**
 * List all courses
 * @param {number} universityId 
 * @param {number} [instituteId] 
 * @param {number} [campusId]
 * @returns {Promise<Array>}
 */
export const listCourses = async (universityId, instituteId, campusId) => {
    try {
        return await courseRepository.getAllCourses(universityId, instituteId, campusId);
    } catch (error) {
        console.error('Error in Course Service (listCourses):', error);
        throw error;
    }
};

/**
 * Get course list with associated subjects
 * @param {number} universityId 
 * @param {number} instituteId 
 * @param {number} acedmicYearId 
 * @returns {Promise<Array>}
 */
export const getCourseWithSubjects = async (universityId, instituteId, acedmicYearId) => {
    try {
        return await courseRepository.getCourseListWithSubjects(universityId, instituteId, acedmicYearId);
    } catch (error) {
        console.error('Error in Course Service (getCourseWithSubjects):', error);
        throw error;
    }
};

/**
 * Get course with its sessions
 * @param {number} courseId 
 * @param {number} universityId 
 * @param {number} [acedmicYearId]
 * @returns {Promise<Object>}
 */
export const getCourseWithSessions = async (courseId, universityId, acedmicYearId) => {
    try {
        const course = await courseRepository.getCourseByIdWithSessions(courseId, universityId, acedmicYearId);
        if (!course) return null;

        const courseData = course.get({ plain: true });
        const totalTerms = courseData.totalTerms || 0;

        if (courseData.sessionCourseMappings) {
            courseData.sessionCourseMappings.forEach(mapping => {
                if (mapping.session) {
                    const existingTerms = new Set();
                    if (mapping.session.classes) {
                        mapping.session.classes.forEach(cls => {
                            if (cls.term) {
                                existingTerms.add(cls.term);
                            }
                        });
                    }

                    const missingTerms = [];
                    for (let i = 1; i <= totalTerms; i++) {
                        if (!existingTerms.has(i)) {
                            missingTerms.push(courseData.termType + " " + i);
                        }
                    }
                    mapping.session.missingTerms = missingTerms;

                    // remove classes from session
                    delete mapping.session.classes;
                }
            });
        }

        return courseData;
    } catch (error) {
        console.error('Error in Course Service (getCourseWithSessions):', error);
        throw error;
    }
};
/**
 * Get class sections grouped by term
 * @param {number} courseId 
 * @param {number} sessionId 
 * @returns {Promise<Array>}
 */
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
                .filter(cs => cs.classGroup && cs.classGroup.term === i)
                .map(cs => ({ name: cs.section, id: cs.classSectionsId }))
                .filter(Boolean); // Remove null/undefined sections

            grouped.push({
                termName: semesterName,
                term: i,
                classSections: sections
            });
        }

        return grouped;
    } catch (error) {
        console.error('Error in Course Service (getClassSectionsGroupedByTerm):', error);
        throw error;
    }
};

/**
 * Get term options for a course
 * @param {number} courseId 
 * @returns {Promise<Array>}
 */
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
                term: i
            });
        }

        return terms;
    } catch (error) {
        console.error('Error in Course Service (getTermOptionsByCourse):', error);
        throw error;
    }
};
