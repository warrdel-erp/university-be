import * as studentHallTicketServices from "../services/studentHallTicketServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function generateHallTickets(req, res) {
    try {
        const result = await studentHallTicketServices.generateHallTicketsForUser(req.body, req.user);
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
