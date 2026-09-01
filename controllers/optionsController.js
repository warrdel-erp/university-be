import * as optionsServices from '../services/optionsServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import { validateEmployeeUser } from '../utility/employeeValidation.js';
import { getAcademicYearId } from '../utility/requestContext.js';

export const getAffiliatedUniversityOptions = async (req, res) => {
    try {
        const result = await optionsServices.getAffiliatedUniversityOptions();
        return SuccessResponse(res, 200, "Affiliated university options fetched successfully", result);
    } catch (error) {
        console.error("Error in getAffiliatedUniversityOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getCourseOptions = async (req, res) => {
    try {
        const { courseLevelId } = req.query;
        const result = await optionsServices.getCourseOptions(courseLevelId);
        return SuccessResponse(res, 200, "Course options fetched successfully", result);
    } catch (error) {
        console.error("Error in getCourseOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export async function getMyCourseOptions(req, res) {
    try {
        const validation = await validateEmployeeUser(req, res);
        if (!validation.valid) {
            return ErrorResponse(res, validation.status, validation.message);
        }
        if (!validation.employeeRecord) {
            return SuccessResponse(res, 200, "Course options fetched successfully", []);
        }

        const { courseLevelId } = req.query;
        const result = await optionsServices.getMyCourseOptions(
            courseLevelId,
            validation.userId,
        );
        return SuccessResponse(res, 200, "Course options fetched successfully", result);
    } catch (error) {
        console.error("Error in getMyCourseOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export const getTermOptions = async (req, res) => {
    try {
        const { courseId } = req.query;
        const result = await optionsServices.getTermOptions(courseId);
        return SuccessResponse(res, 200, "Term options fetched successfully", result);
    } catch (error) {
        console.error("Error in getTermOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getCourseProgramOptions = async (req, res) => {
    try {
        const { courseId } = req.query;
        const result = await optionsServices.getCourseProgramOptions(courseId);
        return SuccessResponse(res, 200, "Course program details fetched successfully", result);
    } catch (error) {
        console.error("Error in getCourseProgramOptions:", error);
        const status = error.message?.includes('not found') ? 400 : 500;
        return ErrorResponse(res, status, error.message || 'Internal Server Error');
    }
};

export const getClassSectionOptions = async (req, res) => {
    try {
        const { courseId, term, sessionId, year } = req.query;
        const result = await optionsServices.getClassSectionOptions(courseId, term, sessionId, year);
        return SuccessResponse(res, 200, "Class section options fetched successfully", result);
    } catch (error) {
        console.error("Error in getClassSectionOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getSpecializationOptions = async (req, res) => {
    try {
        const { courseId } = req.query;
        const result = await optionsServices.getSpecializationOptions(courseId);
        return SuccessResponse(res, 200, "Specialization options fetched successfully", result);
    } catch (error) {
        console.error("Error in getSpecializationOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export async function getSubjectOptions(req, res) {
    try {
        const { courseId, term, sessionId, userId } = req.query;
        const academicYearId = getAcademicYearId();
        const result = await optionsServices.getSubjectOptions(
            courseId,
            term,
            academicYearId,
            sessionId,
            userId,
        );
        return SuccessResponse(res, 200, "Subject options fetched successfully", result);
    } catch (error) {
        console.error("Error in getSubjectOptions:", error);
        const status = error.message?.includes("not found") || error.message?.includes("not mapped") ? 400 : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export async function getMySubjectOptions(req, res) {
    try {
        const validation = await validateEmployeeUser(req, res);
        if (!validation.valid) {
            return ErrorResponse(res, validation.status, validation.message);
        }
        const { userId } = validation;
        const { courseId, term, sessionId } = req.query;
        const academicYearId = getAcademicYearId();
        const result = await optionsServices.getSubjectOptions(
            courseId,
            term,
            academicYearId,
            sessionId,
            userId,
        );
        return SuccessResponse(res, 200, "Subject options fetched successfully", result);
    } catch (error) {
        console.error("Error in getMySubjectOptions:", error);
        const status = error.message?.includes("not found") || error.message?.includes("not mapped") ? 400 : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export const getTeacherOptions = async (req, res) => {
    try {
        const { campusId, subjectId } = req.query;
        const result = await optionsServices.getTeacherOptions(campusId, subjectId);
        return SuccessResponse(res, 200, "Teacher options fetched successfully", result);
    } catch (error) {
        console.error("Error in getTeacherOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getTimeTableStructureOptions = async (req, res) => {
    try {
        const result = await optionsServices.getTimeTableStructureOptions();
        return SuccessResponse(res, 200, "Time table structure options fetched successfully", result);
    } catch (error) {
        console.error("Error in getTimeTableStructureOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getFeePlanOptions = async (req, res) => {
    try {
        const result = await optionsServices.getFeePlanOptions(req.query);
        return SuccessResponse(res, 200, "Fee plan options fetched successfully", result);
    } catch (error) {
        console.error("Error in getFeePlanOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getLectureWindowOptions = async (req, res) => {
    try {
        const { userId, employeeId, subjectId, date, sessionId } = req.query;
        const academicYearId = getAcademicYearId();
        if (!academicYearId) {
            return ErrorResponse(res, 400, "academicYearId not found in user session");
        }

        const result = await optionsServices.getLectureWindowOptions(
            userId != null ? Number(userId) : undefined,
            employeeId != null ? Number(employeeId) : undefined,
            Number(subjectId),
            Number(academicYearId),
            date,
            sessionId != null ? Number(sessionId) : undefined,
        );
        return SuccessResponse(res, 200, "Lecture window options fetched successfully", result);
    } catch (error) {
        console.error("Error in getLectureWindowOptions:", error);
        const status = error.message?.includes('not found') || error.message?.includes('no linked userId')
            ? 404
            : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export const getMyLectureWindowOptions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { subjectId, date, sessionId } = req.query;
        const academicYearId = getAcademicYearId();
        if (!academicYearId) {
            return ErrorResponse(res, 400, "academicYearId not found in user session");
        }

        const result = await optionsServices.getLectureWindowOptions(
            Number(userId),
            undefined,
            Number(subjectId),
            Number(academicYearId),
            date,
            sessionId != null ? Number(sessionId) : undefined,
        );
        return SuccessResponse(res, 200, "Lecture window options fetched successfully", result);
    } catch (error) {
        console.error("Error in getMyLectureWindowOptions:", error);
        const status = error.message?.includes('not found') || error.message?.includes('no linked userId')
            ? 404
            : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export const getLessonOptions = async (req, res) => {
    try {
        const { lectureWindowId } = req.query;
        const academicYearId = getAcademicYearId();
        if (!academicYearId) {
            return ErrorResponse(res, 400, "academicYearId not found in user session");
        }

        const result = await optionsServices.getLessonOptions(
            Number(lectureWindowId),
            Number(academicYearId),
        );
        return SuccessResponse(res, 200, "Lesson options fetched successfully", result);
    } catch (error) {
        console.error("Error in getLessonOptions:", error);
        const status = error.message?.includes('not found') ? 404 : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export const getTopicOptions = async (req, res) => {
    try {
        const { lessonId } = req.query;
        const academicYearId = getAcademicYearId();
        if (!academicYearId) {
            return ErrorResponse(res, 400, "academicYearId not found in user session");
        }

        const result = await optionsServices.getTopicOptions(
            Number(lessonId),
            Number(academicYearId),
        );
        return SuccessResponse(res, 200, "Topic options fetched successfully", result);
    } catch (error) {
        console.error("Error in getTopicOptions:", error);
        const status = error.message?.includes('not found') ? 404 : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export const getStudentFilterOptions = async (req, res) => {
    try {
        const result = await optionsServices.getStudentFilterOptions(req.query);
        return SuccessResponse(res, 200, "Student filter options fetched successfully", result);
    } catch (error) {
        console.error("Error in getStudentFilterOptions:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};
