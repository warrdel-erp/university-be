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

/** GET query: `termNumber`, `sessionId` — cohort list with `examType` (`theory`|`practical`|null), `studentCount`, `isHallTicketGenerated`. */
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
        const q = req.query;
        const filters = {
            ...(q.examSetupTypeTermId && { examSetupTypeTermId: Number(q.examSetupTypeTermId) }),
            ...(q.sessionId && { sessionId: Number(q.sessionId) }),
            ...(q.studentId && { studentId: Number(q.studentId) }),
            instituteId: req.user.defaultInstituteId,
            universityId: req.user.universityId,
        };

        const result = await studentHallTicketServices.getAllHallTickets(filters, {
            page: q.page,
            limit: q.limit,
        });
        return SuccessResponse(res, 200, "Hall tickets fetched successfully", result.rows, {
            total: result.total,
            limit: result.limit,
            page: result.page,
        });
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
