import * as examScheduleServices from '../services/examScheduleServices.js';
import * as studentHallTicketServices from '../services/studentHallTicketServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const getExamListWithHallTickets = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const acedmicYearId = req.user.defaultAcademicYearId;
        const instituteId = req.user.defaultInstituteId;
        const q = req.query;

        const filters = {
            ...(q.subjectId != null && { subjectId: Number(q.subjectId) }),
            ...(q.semesterId != null && { semesterId: Number(q.semesterId) }),
            ...(q.examSetupTypeTermId != null && { examSetupTypeTermId: Number(q.examSetupTypeTermId) }),
            ...(q.courseId != null && { courseId: Number(q.courseId) }),
            ...(q.term !== undefined && q.term !== null && q.term !== '' && { term: Number(q.term) }),
            ...(q.sessionId != null && { sessionId: Number(q.sessionId) }),
        };

        const result = await studentHallTicketServices.getExamListWithHallTickets({
            universityId,
            acedmicYearId,
            instituteId,
            filters,
        });

        return SuccessResponse(res, 200, "Exam list with hall ticket status fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamListWithHallTickets:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export const getExamSchedules = async (req, res) => {
    try {
        const universityId = req.user.universityId;
        const acedmicYearId = req.user.defaultAcademicYearId
        const instituteId = req.user.defaultInstituteId;

        const { subjectId, semesterId, examSetupTypeTermId, courseId, term, sessionId } = req.query;

        const filters = {
            ...(subjectId && { subjectId: parseInt(subjectId) }),
            ...(semesterId && { semesterId: parseInt(semesterId) }),
            ...(examSetupTypeTermId && { examSetupTypeTermId: parseInt(examSetupTypeTermId) }),
            ...(courseId && { courseId: parseInt(courseId) }),
            ...(term && { term: parseInt(term) }),
            ...(sessionId && { sessionId: parseInt(sessionId) })
        };

        const result = await examScheduleServices.getExamSchedules(universityId, acedmicYearId, instituteId, filters);
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
        const userId = req.user.userId;

        const result = await examScheduleServices.allocateSeatsRandomly(examScheduleId, userId);
        return SuccessResponse(res, 200, "Students allocated to seats successfully", result);
    } catch (error) {
        console.error("Error in allocateSeats controller:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
};
