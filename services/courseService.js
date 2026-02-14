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
 * Get course with its sessions
 * @param {number} courseId 
 * @param {number} universityId 
 * @param {number} [acedmicYearId]
 * @returns {Promise<Object>}
 */
export const getCourseWithSessions = async (courseId, universityId, acedmicYearId) => {
    try {
        return await courseRepository.getCourseByIdWithSessions(courseId, universityId, acedmicYearId);
    } catch (error) {
        console.error('Error in Course Service (getCourseWithSessions):', error);
        throw error;
    }
};
