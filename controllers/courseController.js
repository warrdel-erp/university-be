import * as courseService from '../services/courseService.js';

/**
 * Handle listing of courses
 */
export const listCourses = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const { instituteId, campusId } = req.query;

        if (!universityId) {
            return res.status(400).json({
                status: 'error',
                message: 'University Id is missing from user session'
            });
        }

        const result = await courseService.listCourses(universityId, instituteId, campusId);

        return res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error("Error in List Course Controller:", error);
        return res.status(500).json({
            status: 'error',
            message: "Internal Server Error",
            error: error.message
        });
    }
};

/**
 * Handle getting course list with associated subjects
 */
export const getCourseWithSubjects = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const { instituteId, acedmicYearId } = req.query;

        if (!universityId) {
            return res.status(400).json({
                status: 'error',
                message: 'University Id is missing from user session'
            });
        }

        const result = await courseService.getCourseWithSubjects(universityId, instituteId, acedmicYearId);

        return res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error("Error in Get Course With Subjects Controller:", error);
        return res.status(500).json({
            status: 'error',
            message: "Internal Server Error",
            error: error.message
        });
    }
};

/**
 * Handle getting a single course with its sessions
 */
export const getCourseSessions = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const acedmicYearId = req.user.defaultAcademicYearId;

        const courseId = req.params.courseId;

        if (!universityId) {
            return res.status(400).json({
                status: 'error',
                message: 'University Id is missing from user session'
            });
        }

        const result = await courseService.getCourseWithSessions(courseId, universityId, acedmicYearId);

        if (!result) {
            return res.status(404).json({
                status: 'error',
                message: 'Course not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error("Error in Get Course Sessions Controller:", error);
        return res.status(500).json({
            status: 'error',
            message: "Internal Server Error",
            error: error.message
        });
    }
};
/**
 * Handle getting class sections grouped by term
 */
export const getClassSectionsGrouped = async (req, res) => {
    try {
        const { courseId, sessionId } = req.query;

        const result = await courseService.getClassSectionsGroupedByTerm(courseId, sessionId);

        return res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error("Error in Get Class Sections Grouped Controller:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            status: 'error',
            message: error.message || "Internal Server Error"
        });
    }
};
