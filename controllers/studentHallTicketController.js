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

export async function getHallTicketById(req, res) {
    try {
        const result = await studentHallTicketServices.getHallTicketById(Number(req.params.id));
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
