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

export async function getAnswerSheetQrGenerationRequests(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { page = 1, limit = 10 } = req.query;
    const result = await answerSheetQrServices.getAnswerSheetQrGenerationRequests(
      instituteId,
      universityId,
      page,
      limit
    );

    return SuccessResponse(
      res,
      200,
      "Answer sheet QR generation requests fetched successfully",
      result.data,
      result.paginationData
    );
  } catch (error) {
    console.error(
      "Error in getAnswerSheetQrGenerationRequests controller:",
      error
    );

    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

export async function getAnswerSheetQrsByRequestId(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { requestId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await answerSheetQrServices.getAnswerSheetQrsByRequestId(
      requestId,
      instituteId,
      universityId,
      page,
      limit
    );

    return SuccessResponse(
      res,
      200,
      "Answer sheet QRs fetched by request successfully",
      result.data,
      result.pagination
    );
  } catch (error) {
    console.error("Error in getAnswerSheetQrsByRequestId controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function assignAnswerSheetsToTeachers(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { assignedToUserId, answerSheetQrIds } = req.body;

    const result = await answerSheetQrServices.assignAnswerSheetsToTeachers(
      assignedToUserId,
      answerSheetQrIds,
      instituteId,
      universityId
    );

    return SuccessResponse(res, 200, "Answer sheets assigned to teachers successfully", result);
  } catch (error) {
    console.error("Error in assignAnswerSheetsToTeachers controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getScriptsAssignedToTeacher(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { assignedToUserId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await answerSheetQrServices.getScriptsAssignedToTeacher(
      assignedToUserId,
      instituteId,
      universityId,
      page,
      limit
    );

    return SuccessResponse(
      res,
      200,
      "Assigned scripts fetched successfully",
      result.data,
      { ...result.pagination, teacher: result.teacher }
    );
  } catch (error) {
    console.error("Error in getScriptsAssignedToTeacher controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function assignObtainedMarksToAnswerSheet(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { id } = req.params;
    const { obtained_marks } = req.body;

    const result = await answerSheetQrServices.assignObtainedMarksToAnswerSheet(
      Number(id),
      Number(obtained_marks),
      instituteId,
      universityId
    );

    return SuccessResponse(res, 200, "Obtained marks assigned successfully", result);
  } catch (error) {
    console.error("Error in assignObtainedMarksToAnswerSheet controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}