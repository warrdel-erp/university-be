import * as service from "../services/studentBillingBreakdownServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

/**
 * Controller to fetch student fee breakdown and applied treatments preview.
 */
export async function getStudentBillingBreakdown(req, res) {
  try {
    const data = await service.getStudentBillingBreakdown(req.query, req.user);
    return SuccessResponse(
      res,
      200,
      "Student billing breakdown retrieved successfully",
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

