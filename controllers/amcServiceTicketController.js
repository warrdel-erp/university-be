import * as amcServiceTicketService from "../services/amcServiceTicketServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addServiceTicket(req, res) {
  try {
    const row = await amcServiceTicketService.addServiceTicket(req.body);
    return SuccessResponse(res, 201, "Service ticket raised successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function addMyServiceTicket(req, res) {
  try {
    const userId = req.user.userId;
    const row = await amcServiceTicketService.addMyServiceTicket(userId, req.body);
    return SuccessResponse(res, 201, "Service ticket raised successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllServiceTickets(req, res) {
  try {
    const result = await amcServiceTicketService.listServiceTickets(req.query);
    return SuccessResponse(res, 200, "Service tickets fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleServiceTicketDetails(req, res) {
  try {
    const { serviceTicketId } = req.query;
    const row = await amcServiceTicketService.getSingleServiceTicket(serviceTicketId);
    if (!row) {
      return ErrorResponse(res, 404, "Service ticket not found");
    }
    return SuccessResponse(res, 200, "Service ticket fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMySingleServiceTicketDetails(req, res) {
  try {
    const userId = req.user.userId;
    const { serviceTicketId } = req.query;
    const row = await amcServiceTicketService.getMySingleServiceTicket(userId, serviceTicketId);
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
    const row = await amcServiceTicketService.updateServiceTicket(serviceTicketId, req.body);
    return SuccessResponse(res, 200, "Service ticket updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteServiceTicket(req, res) {
  try {
    const { serviceTicketId } = req.query;
    await amcServiceTicketService.deleteServiceTicket(serviceTicketId);
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
    const row = await amcServiceTicketService.previewTicketNumber();
    return SuccessResponse(res, 200, "Service ticket number preview fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMyServiceTickets(req, res) {
  try {
    const userId = req.user.userId;
    const result = await amcServiceTicketService.listMyServiceTickets(userId, req.query);
    return SuccessResponse(res, 200, "Service tickets fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMyServiceTicketSummary(req, res) {
  try {
    const userId = req.user.userId;
    const data = await amcServiceTicketService.getMyServiceTicketSummary(userId);
    return SuccessResponse(res, 200, "Service ticket summary fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getServiceTicketSummary(req, res) {
  try {
    const data = await amcServiceTicketService.getServiceTicketSummary();
    return SuccessResponse(res, 200, "Service ticket summary fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
