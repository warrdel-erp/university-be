import * as service from "../services/studentBillingBreakdownServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

/**
 * Controller to fetch student fee breakdown and applied treatments preview.
 */
export async function getStudentBillingBreakdown(req, res) {
  try {
    const result = await service.getStudentBillingBreakdown(req.query, req.user);
    const data = result.data !== undefined ? result.data : result;
    const paginationData = result.paginationData;
    return SuccessResponse(
      res,
      200,
      "Student billing breakdown retrieved successfully",
      data,
      paginationData
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

