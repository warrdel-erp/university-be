import * as examOperationsServices from "../services/examOperationsServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function listRooms(req, res) {
  try {
    const result = await examOperationsServices.listRooms(req.query);
    return SuccessResponse(
      res,
      200,
      "Exam operations rooms fetched successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch exam operations rooms",
    );
  }
}
