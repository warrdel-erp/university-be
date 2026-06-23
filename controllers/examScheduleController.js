import * as examScheduleServices from '../services/examScheduleServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const getExamSchedules = async (req, res) => {
    try {
        const { subjectId, semesterId, examSetupTypeTermId, courseId, term, sessionId } = req.query;

        const filters = {
            ...(subjectId && { subjectId: parseInt(subjectId, 10) }),
            ...(semesterId && { semesterId: parseInt(semesterId, 10) }),
            ...(examSetupTypeTermId && { examSetupTypeTermId: parseInt(examSetupTypeTermId, 10) }),
            ...(courseId && { courseId: parseInt(courseId, 10) }),
            ...(term && { term: parseInt(term, 10) }),
            ...(sessionId && { sessionId: parseInt(sessionId, 10) }),
        };

        const result = await examScheduleServices.getExamSchedules(filters);
        return SuccessResponse(res, 200, "Exam schedules fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamSchedules controller:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getExamScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await examScheduleServices.getExamScheduleById(id);

        if (!result) {
            return ErrorResponse(res, 404, "Exam schedule not found");
        }

        return SuccessResponse(res, 200, "Exam schedule fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamScheduleById controller:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const allocateSeats = async (req, res) => {
    try {
        const { examScheduleId } = req.body;
        const result = await examScheduleServices.allocateSeatsRandomly(examScheduleId, req.user.userId);
        return SuccessResponse(res, 200, "Students allocated to seats successfully", result);
    } catch (error) {
        console.error("Error in allocateSeats controller:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
};

export const allocateSeatsAscending = async (req, res) => {
    try {
        const { examScheduleId } = req.body;
        const result = await examScheduleServices.allocateSeatsAscending(examScheduleId, req.user.userId);
        return SuccessResponse(res, 200, "Students allocated to seats successfully", result);
    } catch (error) {
        console.error("Error in allocateSeatsAscending controller:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
};

export const allocateSeatsDescending = async (req, res) => {
    try {
        const { examScheduleId } = req.body;
        const result = await examScheduleServices.allocateSeatsDescending(examScheduleId, req.user.userId);
        return SuccessResponse(res, 200, "Students allocated to seats successfully", result);
    } catch (error) {
        console.error("Error in allocateSeatsDescending controller:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
};
