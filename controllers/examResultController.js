import * as examResultServices from "../services/examResultServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function listStudents(req, res) {
  try {
    const result = await examResultServices.listStudents(req.query);
    return SuccessResponse(res, 200, "Exam result students fetched successfully", result.data, result.pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch exam result students");
  }
}

export async function getStudentById(req, res) {
  try {
    const result = await examResultServices.getStudentById(req.params.studentId, req.query);
    return SuccessResponse(res, 200, "Exam result student fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch exam result student");
  }
}
