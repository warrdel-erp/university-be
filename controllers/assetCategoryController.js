import * as assetCategoryService from "../services/assetCategoryServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addAssetCategory(req, res) {
  try {
    const row = await assetCategoryService.addAssetCategory(req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 201, "Asset category added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllAssetCategory(req, res) {
  try {
    const rows = await assetCategoryService.listAssetCategories(req.user.defaultInstituteId);
    return SuccessResponse(res, 200, "Asset categories fetched successfully", rows);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleAssetCategoryDetails(req, res) {
  try {
    const { assetCategoryId } = req.query;
    const row = await assetCategoryService.getSingleAssetCategory(
      assetCategoryId,
      req.user.defaultInstituteId
    );
    if (!row) {
      return ErrorResponse(res, 404, "Asset category not found");
    }
    return SuccessResponse(res, 200, "Asset category fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateAssetCategory(req, res) {
  try {
    const { assetCategoryId } = req.body;
    const row = await assetCategoryService.updateAssetCategory(
      assetCategoryId,
      req.body,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "Asset category updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteAssetCategory(req, res) {
  try {
    const { assetCategoryId } = req.query;
    await assetCategoryService.deleteAssetCategory(assetCategoryId, req.user.defaultInstituteId);
    return SuccessResponse(
      res,
      200,
      `Asset category deleted successfully (ID ${assetCategoryId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
