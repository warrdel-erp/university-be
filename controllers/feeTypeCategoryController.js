import * as feeTypeCategoryService from "../services/feeTypeCategoryServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addFeeTypeCategory(req, res) {
  try {
    const row = await feeTypeCategoryService.addFeeTypeCategory(req.body);
    return SuccessResponse(res, 201, "Fee type category added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllFeeTypeCategory(req, res) {
  try {
    const rows = await feeTypeCategoryService.listFeeTypeCategories();
    return SuccessResponse(res, 200, "Fee type categories fetched successfully", rows);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleFeeTypeCategoryDetails(req, res) {
  try {
    const { feeTypeCategoryId } = req.query;
    const row = await feeTypeCategoryService.getSingleFeeTypeCategory(feeTypeCategoryId);
    if (!row) {
      return ErrorResponse(res, 404, "Fee type category not found");
    }
    return SuccessResponse(res, 200, "Fee type category fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateFeeTypeCategory(req, res) {
  try {
    const { feeTypeCategoryId } = req.body;
    const row = await feeTypeCategoryService.updateFeeTypeCategory(feeTypeCategoryId, req.body);
    return SuccessResponse(res, 200, "Fee type category updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteFeeTypeCategory(req, res) {
  try {
    const { feeTypeCategoryId } = req.query;
    await feeTypeCategoryService.deleteFeeTypeCategory(feeTypeCategoryId);
    return SuccessResponse(
      res,
      200,
      `Fee type category deleted successfully (ID ${feeTypeCategoryId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
