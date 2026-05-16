import * as studentFeeInvoiceService from "../services/studentFeeInvoiceServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function generateStudentFeeInvoice(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const { studentId, feePlanItemId } = req.body;
    const data = await studentFeeInvoiceService.generateStudentFeeInvoice(
      { studentId, feePlanItemId },
      instituteId
    );
    return SuccessResponse(res, 201, "Invoice generated", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getStudentFeeInvoiceById(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const { studentFeeInvoiceId } = req.query;
    const data = await studentFeeInvoiceService.getStudentFeeInvoiceById(
      studentFeeInvoiceId,
      instituteId
    );
    return SuccessResponse(res, 200, "Student fee invoice fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function listStudentFeeInvoicesByStudent(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const { studentId } = req.query;
    const data = await studentFeeInvoiceService.listStudentFeeInvoicesByStudentId(
      studentId,
      instituteId
    );
    return SuccessResponse(res, 200, "Student fee invoices fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function listAllStudentFeeInvoices(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const { paymentTab } = req.query;
    const data = await studentFeeInvoiceService.listAllStudentFeeInvoices(instituteId, {
      paymentTab,
    });
    return SuccessResponse(res, 200, "All student fee invoices fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
