import * as serviceTicketService from "../services/serviceTicketServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addServiceTicket(req, res) {
  try {
    const row = await serviceTicketService.addServiceTicket(req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 201, "Service ticket raised successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllServiceTickets(req, res) {
  try {
    const result = await serviceTicketService.listServiceTickets(
      req.user.defaultInstituteId,
      req.query
    );
    return SuccessResponse(res, 200, "Service tickets fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleServiceTicketDetails(req, res) {
  try {
    const { serviceTicketId } = req.query;
    const row = await serviceTicketService.getSingleServiceTicket(
      serviceTicketId,
      req.user.defaultInstituteId
    );
    if (!row) {
      return ErrorResponse(res, 404, "Service ticket not found");
    }
    return SuccessResponse(res, 200, "Service ticket fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateServiceTicket(req, res) {
  try {
    const { serviceTicketId } = req.body;
    const row = await serviceTicketService.updateServiceTicket(
      serviceTicketId,
      req.body,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "Service ticket updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteServiceTicket(req, res) {
  try {
    const { serviceTicketId } = req.query;
    await serviceTicketService.deleteServiceTicket(serviceTicketId, req.user.defaultInstituteId);
    return SuccessResponse(
      res,
      200,
      `Service ticket deleted successfully (ID ${serviceTicketId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function previewServiceTicketNumber(req, res) {
  try {
    const row = await serviceTicketService.previewTicketNumber(req.user.defaultInstituteId);
    return SuccessResponse(res, 200, "Service ticket number preview fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getServiceTicketSummary(req, res) {
  try {
    const data = await serviceTicketService.getServiceTicketSummary(req.user.defaultInstituteId);
    return SuccessResponse(res, 200, "Service ticket summary fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
