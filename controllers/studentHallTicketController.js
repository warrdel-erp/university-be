import * as studentHallTicketServices from "../services/studentHallTicketServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function generateHallTickets(req, res) {
    try {
        const { examSetupTypeTermId, sessionId } = req.body;
        const result = await studentHallTicketServices.generateHallTicketsByExamSession({
            examSetupTypeTermId,
            sessionId,
            instituteId: req.user.defaultInstituteId,
            universityId: req.user.universityId
        });
        return SuccessResponse(res, 201, "Hall tickets generated successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}

export async function canGenerateHallTickets(req, res) {
    try {
        const examSetupTypeTermId = Number(req.query.examSetupTypeTermId);
        const sessionId = Number(req.query.sessionId);

        const result = await studentHallTicketServices.canGenerateHallTicketsByExamSession({
            examSetupTypeTermId,
            sessionId,
            instituteId: req.user.defaultInstituteId,
            universityId: req.user.universityId
        });
        return SuccessResponse(res, 200, "Hall ticket generation readiness fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}

export async function getHallTicketStatusByExamType(req, res) {
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
            ...(q.term !== undefined && q.term !== null && q.term !== "" && { term: Number(q.term) }),
            ...(q.sessionId != null && { sessionId: Number(q.sessionId) }),
            ...(q.examSetupTypeId != null && { examSetupTypeId: Number(q.examSetupTypeId) }),
        };

        const result = await studentHallTicketServices.getHallTicketStatusByExamType({
            universityId,
            acedmicYearId,
            instituteId,
            filters,
        });

        return SuccessResponse(res, 200, "Hall ticket generation status by exam type fetched successfully", result);
    } catch (error) {
        console.error("Error in getHallTicketStatusByExamType:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function getExamsScheduled(req, res) {
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
            ...(q.term !== undefined && q.term !== null && q.term !== "" && { term: Number(q.term) }),
            ...(q.sessionId != null && { sessionId: Number(q.sessionId) }),
            ...(q.examSetupTypeId != null && { examSetupTypeId: Number(q.examSetupTypeId) }),
        };

        const result = await studentHallTicketServices.getScheduledExamsWithHallTicketInfo({
            universityId,
            acedmicYearId,
            instituteId,
            filters,
        });

        return SuccessResponse(res, 200, "Scheduled exams with hall ticket status fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamsScheduled:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function getAllHallTickets(req, res) {
    try {
        const filters = {
            ...(req.query.examSetupTypeTermId && { examSetupTypeTermId: Number(req.query.examSetupTypeTermId) }),
            ...(req.query.sessionId && { sessionId: Number(req.query.sessionId) }),
            ...(req.query.studentId && { studentId: Number(req.query.studentId) }),
            instituteId: req.user.defaultInstituteId,
            universityId: req.user.universityId
        };

        const result = await studentHallTicketServices.getAllHallTickets(filters);
        return SuccessResponse(res, 200, "Hall tickets fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

/** All hall tickets for the current institute across every exam/session (no examSetupTypeTermId/sessionId filter). */
export async function getAllHallTicketsAllExams(req, res) {
    try {
        const filters = {
            ...(req.query.studentId && { studentId: Number(req.query.studentId) }),
            instituteId: req.user.defaultInstituteId,
            universityId: req.user.universityId
        };

        const result = await studentHallTicketServices.getAllHallTicketsAllExams(filters);
        return SuccessResponse(res, 200, "All hall tickets fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function getHallTicketById(req, res) {
    try {
        const result = await studentHallTicketServices.getHallTicketById(Number(req.params.id));
        if (!result) return ErrorResponse(res, 404, "Hall ticket not found");
        return SuccessResponse(res, 200, "Hall ticket fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function getHallTicketByQr(req, res) {
    try {
        const { qr } = req.query;
        const result = await studentHallTicketServices.getHallTicketDetailsByQr(
            qr,
            req.user.defaultInstituteId,
            req.user.universityId
        );
        if (!result) return ErrorResponse(res, 404, "Hall ticket not found");
        return SuccessResponse(res, 200, "Hall ticket fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function updateHallTicket(req, res) {
    try {
        const id = Number(req.params.id);
        const result = await studentHallTicketServices.updateHallTicket(id, req.body);
        if (!result) return ErrorResponse(res, 404, "Hall ticket not found");
        return SuccessResponse(res, 200, "Hall ticket updated successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function deleteHallTicket(req, res) {
    try {
        const id = Number(req.params.id);
        const deletedCount = await studentHallTicketServices.deleteHallTicket(id);
        if (!deletedCount) return ErrorResponse(res, 404, "Hall ticket not found");
        return SuccessResponse(res, 200, "Hall ticket deleted successfully");
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}
