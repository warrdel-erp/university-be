import * as service from "../services/billingScheduleServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createBillingSchedule(req, res) {
  try {
    const data = await service.createBillingSchedule(req.body, req.user);
    return SuccessResponse(res, 201, "Billing schedule created successfully", data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function getBillingSchedules(req, res) {
  try {
    const data = await service.getBillingSchedules(req.query);
    return SuccessResponse(
      res,
      200,
      "Billing schedules fetched successfully",
      data.items,
      data.paginationData
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function getSingleBillingSchedule(req, res) {
  try {
    const id = req.query.billingScheduleItemId || req.params.billingScheduleItemId;
    const data = await service.getSingleBillingSchedule(id);
    return SuccessResponse(
      res,
      200,
      "Billing schedule details fetched successfully",
      data
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function updateBillingSchedule(req, res) {
  try {
    const id = req.body.billingScheduleItemId || req.query.billingScheduleItemId;
    const data = await service.updateBillingSchedule(id, req.body, req.user);
    return SuccessResponse(res, 200, "Billing schedule updated successfully", data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function updateBillingScheduleStatus(req, res) {
  try {
    const id = req.body.billingScheduleItemId;
    const status = req.body.status;
    const data = await service.updateBillingScheduleStatus(id, status);
    return SuccessResponse(res, 200, "Billing schedule status updated successfully", data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function deleteBillingSchedule(req, res) {
  try {
    const id = req.query.billingScheduleItemId || req.params.billingScheduleItemId;
    await service.deleteBillingSchedule(id);
    return SuccessResponse(
      res,
      200,
      `Billing schedule deleted successfully (ID ${id})`,
      null
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function addBillingScheduleSubItem(req, res) {
  try {
    const data = await service.addBillingScheduleSubItem(req.body, req.user);
    return SuccessResponse(
      res,
      201,
      "Billing schedule sub-item added successfully",
      data
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function deleteBillingScheduleSubItem(req, res) {
  try {
    const id =
      req.query.billingScheduleSubItemId || req.params.billingScheduleSubItemId;
    await service.deleteBillingScheduleSubItem(id);
    return SuccessResponse(
      res,
      200,
      `Billing schedule sub-item deleted successfully (ID ${id})`,
      null
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}
