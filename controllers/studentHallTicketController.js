import * as studentHallTicketServices from "../services/studentHallTicketServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function getStudentsForExaminationSession(req, res) {
    try {
        const { examinationSessionId } = req.params;
        const result = await studentHallTicketServices.getStudentsForExaminationSession(examinationSessionId, req.query, req.user);
        if (result && typeof result === "object" && "rows" in result) {
            return SuccessResponse(res, 200, "Students fetched successfully", result.rows, {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            });
        }
        return SuccessResponse(res, 200, "Students fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}

export async function getHallTicketEligibilityOverview(req, res) {
    try {
        const { examinationSessionId } = req.params;
        const result = await studentHallTicketServices.getHallTicketEligibilityOverview(examinationSessionId);
        return SuccessResponse(res, 200, "Hall ticket eligibility overview fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}

export async function generateHallTickets(req, res) {
    try {
        const result = await studentHallTicketServices.generateHallTickets({
            examinationSessionId: Number(req.body.examinationSessionId),
            studentIds: req.body.studentIds,
            user: req.user
        });
        return SuccessResponse(res, 201, "Hall tickets generated successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}

export async function getAllHallTickets(req, res) {
    try {
        const result = await studentHallTicketServices.getAllHallTicketsForUser(req.query, req.user);
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
        const result = await studentHallTicketServices.getHallTicketByIdForUser(req.params.id, req.user);
        if (!result) return ErrorResponse(res, 404, "Hall ticket not found");
        return SuccessResponse(res, 200, "Hall ticket fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function getHallTicketByQr(req, res) {
    try {
        const result = await studentHallTicketServices.getHallTicketByQrForUser(req.query.qr, req.user);
        if (!result) return ErrorResponse(res, 404, "Hall ticket not found");
        return SuccessResponse(res, 200, "Hall ticket fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
}

export async function blockHallTicket(req, res) {
    try {
        const result = await studentHallTicketServices.blockHallTicket(req.params.id);
        return SuccessResponse(res, 200, "Hall ticket blocked successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}

export async function publishHallTickets(req, res) {
    try {
        const result = await studentHallTicketServices.publishHallTickets(req.body);
        return SuccessResponse(res, 200, "Hall tickets published successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}



export async function getStudentEligibilityDetails(req, res) {
    try {
        const result = await studentHallTicketServices.getStudentEligibilityDetails(req.params.examinationSessionId, req.params.studentId);
        return SuccessResponse(res, 200, "Student eligibility details fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}
