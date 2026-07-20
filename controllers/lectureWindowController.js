import * as lectureWindow from "../services/lectureWindowServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { getAcademicYearId } from "../utility/requestContext.js";

function requireActiveAcademicYearId(res) {
    const academicYearId = getAcademicYearId();
    if (!academicYearId) {
        ErrorResponse(res, 400, "academicYearId not found in user session");
        return null;
    }
    return Number(academicYearId);
}

export async function addLectureWindow(req, res) {
    try {
        const academicYearId = requireActiveAcademicYearId(res);
        if (!academicYearId) {
            return;
        }

        const createdBy = req.user.userId;
        const result = await lectureWindow.addLectureWindow(
            {
                ...req.body,
                academicYearId,
            },
            createdBy,
            createdBy,
        );

        return SuccessResponse(res, 201, "Lecture window created successfully", result);
    } catch (error) {
        console.error("Error in addLectureWindow:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function getLectureWindows(req, res) {
    try {
        const academicYearId = requireActiveAcademicYearId(res);
        if (!academicYearId) {
            return;
        }

        const { subjectId, userId, sessionId, lessonId } = req.query;
        const result = await lectureWindow.getLectureWindows({
            academicYearId,
            subjectId,
            userId,
            sessionId,
            lessonId,
        });

        return SuccessResponse(res, 200, "Lecture windows fetched successfully", result);
    } catch (error) {
        console.error("Error in getLectureWindows:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function getLectureWindowById(req, res) {
    try {
        const academicYearId = requireActiveAcademicYearId(res);
        if (!academicYearId) {
            return;
        }

        const { lectureWindowId } = req.params;
        const result = await lectureWindow.getLectureWindowById(lectureWindowId, academicYearId);

        if (!result) {
            return ErrorResponse(res, 404, "Lecture window not found");
        }

        return SuccessResponse(res, 200, "Lecture window fetched successfully", result);
    } catch (error) {
        console.error("Error in getLectureWindowById:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function updateLectureWindow(req, res) {
    try {
        const academicYearId = requireActiveAcademicYearId(res);
        if (!academicYearId) {
            return;
        }

        const { lectureWindowId } = req.params;
        const updatedBy = req.user.userId;

        if (req.body.startDate && req.body.endDate) {
            if (new Date(req.body.startDate) > new Date(req.body.endDate)) {
                return ErrorResponse(res, 400, "startDate cannot be after endDate");
            }
        }

        const result = await lectureWindow.updateLectureWindow(lectureWindowId, req.body, updatedBy, academicYearId);
        if (!result) {
            return ErrorResponse(res, 404, "Lecture window not found");
        }

        return SuccessResponse(res, 200, "Lecture window updated successfully", result);
    } catch (error) {
        console.error("Error in updateLectureWindow:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function deleteLectureWindow(req, res) {
    try {
        const academicYearId = requireActiveAcademicYearId(res);
        if (!academicYearId) {
            return;
        }

        const { lectureWindowId } = req.params;
        const deleted = await lectureWindow.deleteLectureWindow(lectureWindowId, academicYearId);

        if (!deleted) {
            return ErrorResponse(res, 404, "Lecture window not found");
        }

        return SuccessResponse(res, 200, "Lecture window deleted successfully");
    } catch (error) {
        console.error("Error in deleteLectureWindow:", error);
        const statusCode = /lessons are present/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
}
