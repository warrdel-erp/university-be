import * as answerSheetQrServices from "../services/answerSheetQrServices.js";
import { ErrorResponse, SuccessResponse } from "../utility/response.js";

export async function generateAnswerSheetQrBulk(req, res) {
  try {
    const { count } = req.body;
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;

    const result = await answerSheetQrServices.generateBulkAnswerSheetQr(
      Number(count),
      instituteId,
      universityId
    );

    return SuccessResponse(res, 201, "Answer sheet QR codes generated successfully", result);
  } catch (error) {
    console.error("Error in generateAnswerSheetQrBulk controller:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Unable to generate answer sheet QR codes"
    );
  }
}

export async function getAnswerSheetQrList(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { page = 1, limit = 20, usageType = "all" } = req.query;

    const result = await answerSheetQrServices.getAnswerSheetQrListSecure(
      instituteId,
      universityId,
      page,
      limit,
      usageType
    );

    return SuccessResponse(
      res,
      200,
      "Answer sheet QR list fetched successfully",
      result.data,
      result.pagination
    );
  } catch (error) {
    console.error("Error in getAnswerSheetQrList controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function mapAnswerSheetQr(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { qr, studentId, examScheduleId } = req.body;

    const result = await answerSheetQrServices.mapAnswerSheetQr(
      qr,
      studentId,
      examScheduleId,
      instituteId,
      universityId
    );

    return SuccessResponse(res, 200, "QR code mapped successfully", result);
  } catch (error) {
    console.error("Error in mapAnswerSheetQr controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAnswerSheetQrById(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { id } = req.params;

    const result = await answerSheetQrServices.getAnswerSheetQrDetailById(
      Number(id),
      instituteId,
      universityId
    );

    return SuccessResponse(res, 200, "Answer sheet QR details fetched successfully", result);
  } catch (error) {
    console.error("Error in getAnswerSheetQrById controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
