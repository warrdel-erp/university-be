import * as studentFeeInvoiceService from "../services/studentFeeInvoiceServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function generateStudentFeeInvoice(req, res) {
  try {
    const { studentId, feePlanItemId } = req.body;
    const data = await studentFeeInvoiceService.generateStudentFeeInvoice({ studentId, feePlanItemId });
    return SuccessResponse(res, 201, "Invoice generated", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function generateAdhocStudentFeeInvoice(req, res) {
  try {
    const { studentId, feeTypeCatalogs, total, createDate, dueDate } = req.body;
    const data = await studentFeeInvoiceService.generateAdhocStudentFeeInvoice({
      studentId,
      feeTypeCatalogs,
      total,
      createDate,
      dueDate,
    });
    return SuccessResponse(res, 201, "Adhoc fee invoice generated", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getStudentFeeInvoiceById(req, res) {
  try {
    const { studentFeeInvoiceId } = req.query;
    const data = await studentFeeInvoiceService.getStudentFeeInvoiceById(studentFeeInvoiceId);
    return SuccessResponse(res, 200, "Student fee invoice fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function listStudentFeeInvoicesByStudent(req, res) {
  try {
    const { studentId } = req.query;
    const data = await studentFeeInvoiceService.listStudentFeeInvoicesByStudentId(studentId);
    return SuccessResponse(res, 200, "Student fee invoices fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function listAllStudentFeeInvoices(req, res) {
  try {
    const { status, page, limit, search } = req.query;
    const { invoices, pagination, status: currentStatus } =
      await studentFeeInvoiceService.listAllStudentFeeInvoices(status, {
        page,
        limit,
        search,
      });
    return SuccessResponse(
      res,
      200,
      "All student fee invoices fetched successfully",
      {
        status: currentStatus,
        invoices,
      },
      pagination
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
