import * as studentFeePaymentService from "../services/studentFeePaymentServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function recordStudentFeePayment(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const createdBy = req.user.userId;
    const data = await studentFeePaymentService.recordStudentFeePayment(
      req.body,
      instituteId,
      createdBy
    );
    return SuccessResponse(res, 201, "Payment recorded successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function listStudentFeePayments(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const { studentFeeInvoiceId } = req.query;
    const data = await studentFeePaymentService.listPaymentsByInvoiceId(
      studentFeeInvoiceId,
      instituteId
    );
    return SuccessResponse(res, 200, "Payments fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
