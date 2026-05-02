import * as studentHallTicketServices from "../services/studentHallTicketServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

/** Aligns with GET /examStructure/examType/single: `termNumber` preferred over `term`. */
function termFilterFromQuery(q) {
    if (q.termNumber != null && q.termNumber !== "") {
        const n = Number(q.termNumber);
        if (!Number.isNaN(n)) return n;
    }
    if (q.term !== undefined && q.term !== null && q.term !== "") {
        const n = Number(q.term);
        if (!Number.isNaN(n)) return n;
    }
    return undefined;
}

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

        const term = termFilterFromQuery(q);
        const filters = {
            ...(q.subjectId != null && { subjectId: Number(q.subjectId) }),
            ...(q.semesterId != null && { semesterId: Number(q.semesterId) }),
            ...(q.examSetupTypeTermId != null && { examSetupTypeTermId: Number(q.examSetupTypeTermId) }),
            ...(q.courseId != null && { courseId: Number(q.courseId) }),
            ...(term !== undefined && { term }),
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

        const term = termFilterFromQuery(q);
        const filters = {
            ...(q.subjectId != null && { subjectId: Number(q.subjectId) }),
            ...(q.semesterId != null && { semesterId: Number(q.semesterId) }),
            ...(q.examSetupTypeTermId != null && { examSetupTypeTermId: Number(q.examSetupTypeTermId) }),
            ...(q.courseId != null && { courseId: Number(q.courseId) }),
            ...(term !== undefined && { term }),
            ...(q.sessionId != null && { sessionId: Number(q.sessionId) }),
            ...(q.examSetupTypeId != null && { examSetupTypeId: Number(q.examSetupTypeId) }),
        };

        const result = await studentHallTicketServices.getScheduledExamsWithHallTicketInfo({
            universityId,
            acedmicYearId,
            instituteId,
            filters,
        });

        return SuccessResponse(res, 200, "Scheduled exam types fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamsScheduled:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

/** GET query: `termNumber`, `sessionId` — compact cohort list with hall-ticket generated flag. */
export async function getExamTypeDashboard(req, res) {
    try {
        const sessionId = Number(req.query.sessionId);
        const termNumber = Number(req.query.termNumber);
        const result = await studentHallTicketServices.getExamTypeDashboardRows({
            sessionId,
            termNumber,
            instituteId: req.user.defaultInstituteId,
            universityId: req.user.universityId,
            acedmicYearId: req.user.defaultAcademicYearId,
        });
        return SuccessResponse(res, 200, "Exam type dashboard fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
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
        const result = await studentHallTicketServices.getHallTicketById(
            Number(req.params.id),
            req.user.defaultInstituteId,
            req.user.universityId
        );
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
