import * as service from "../services/billingScheduleServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createBillingSchedule(req, res) {
  try {
    const data = await service.createBillingSchedule(req.body, req.user);
    const message = Array.isArray(data)
      ? "Billing schedules created successfully"
      : "Billing schedule created successfully";
    return SuccessResponse(res, 201, message, data);
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
    const feePlanItemId =
      req.body.feePlanItemId ??
      req.body.feeplanItemId ??
      req.query.feePlanItemId ??
      req.query.feeplanItemId;
    const billingScheduleItemId =
      req.body.billingScheduleItemId ?? req.query.billingScheduleItemId;
    const status = req.body.status ?? req.query.status;

    const data = await service.updateBillingScheduleStatus({
      feePlanItemId,
      billingScheduleItemId,
      status,
    });
    return SuccessResponse(
      res,
      200,
      "Billing schedule status updated successfully",
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

export async function addBillingSchedulePaymentTerm(req, res) {
  try {
    const data = await service.addBillingSchedulePaymentTerm(req.body);
    return SuccessResponse(
      res,
      201,
      "Billing schedule payment term added successfully",
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

export async function deleteBillingSchedulePaymentTerm(req, res) {
  try {
    const id =
      req.query.billingSchedulePaymentTermsId ||
      req.params.billingSchedulePaymentTermsId ||
      req.body.billingSchedulePaymentTermsId;
    await service.deleteBillingSchedulePaymentTerm(id);
    return SuccessResponse(
      res,
      200,
      `Billing schedule payment term deleted successfully (ID ${id})`,
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

export async function getBillingScheduleBatches(req, res) {
  try {
    const data = await service.getBillingScheduleBatches(req.query);
    return SuccessResponse(
      res,
      200,
      "Billing schedule batches fetched successfully",
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

export async function getBillingScheduleBatchOverview(req, res) {
  try {
    const data = await service.getBillingScheduleBatchOverview(req.query);
    return SuccessResponse(
      res,
      200,
      "Billing schedule batch overview fetched successfully",
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

export async function getBillingScheduleBatchReview(req, res) {
  try {
    const data = await service.getBillingScheduleBatchReview(req.query);
    return SuccessResponse(
      res,
      200,
      "Billing schedule batch review fetched successfully",
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



