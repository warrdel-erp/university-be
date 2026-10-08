import * as service from "../services/billingSchedulePaymentTermsServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createPaymentTerm(req, res) {
  try {
    const data = await service.createPaymentTerm(req.body);
    const message = Array.isArray(data)
      ? "Billing schedule payment terms created successfully"
      : "Billing schedule payment term created successfully";
    return SuccessResponse(res, 201, message, data);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function getPaymentTerms(req, res) {
  try {
    const data = await service.getPaymentTerms(req.query);
    return SuccessResponse(
      res,
      200,
      "Billing schedule payment terms fetched successfully",
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

export async function getSinglePaymentTerm(req, res) {
  try {
    const id =
      req.query.billingSchedulePaymentTermsId ||
      req.params.billingSchedulePaymentTermsId;
    const data = await service.getSinglePaymentTerm(id);
    return SuccessResponse(
      res,
      200,
      "Billing schedule payment term details fetched successfully",
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

export async function updatePaymentTerm(req, res) {
  try {
    const id =
      req.body.billingSchedulePaymentTermsId ||
      req.query.billingSchedulePaymentTermsId ||
      req.params.billingSchedulePaymentTermsId;
    const data = await service.updatePaymentTerm(id, req.body);
    return SuccessResponse(
      res,
      200,
      "Billing schedule payment term updated successfully",
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

export async function deletePaymentTerm(req, res) {
  try {
    const id =
      req.query.billingSchedulePaymentTermsId ||
      req.params.billingSchedulePaymentTermsId ||
      req.body.billingSchedulePaymentTermsId;
    await service.deletePaymentTerm(id);
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
