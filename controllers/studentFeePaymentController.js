import * as studentFeePaymentService from "../services/studentFeePaymentServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function listStudentFeePayments(req, res) {
  try {
    const { data, pagination } = await studentFeePaymentService.listStudentFeePayments(req.query);
    return SuccessResponse(res, 200, "Payments fetched successfully", data, pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getStudentFeePaymentById(req, res) {
  try {
    const { studentFeePaymentId } = req.query;
    const data = await studentFeePaymentService.getStudentFeePaymentById(studentFeePaymentId);
    return SuccessResponse(res, 200, "Payment fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function recordStudentFeePaymentFromDetails(req, res) {
  try {
    const createdBy = req.user.userId;
    const data = await studentFeePaymentService.recordStudentFeePaymentFromDetails(req.body, createdBy);
    return SuccessResponse(res, 201, "Payment recorded successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getPaymentDetails(req, res) {
  try {
    const { studentId } = req.query;
    const data = await studentFeePaymentService.getPaymentDetails(studentId);
    return SuccessResponse(res, 200, "Payment details fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
