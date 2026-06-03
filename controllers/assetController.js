import * as assetService from "../services/assetServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addAsset(req, res) {
  try {
    const row = await assetService.addAsset(req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 201, "Asset added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllAsset(req, res) {
  try {
    const { data, pagination } = await assetService.listAssets(
      req.user.defaultInstituteId,
      req.query
    );
    return SuccessResponse(res, 200, "Assets fetched successfully", data, pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleAssetDetails(req, res) {
  try {
    const { assetId } = req.query;
    const row = await assetService.getSingleAsset(assetId, req.user.defaultInstituteId);
    if (!row) {
      return ErrorResponse(res, 404, "Asset not found");
    }
    return SuccessResponse(res, 200, "Asset fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateAsset(req, res) {
  try {
    const { assetId } = req.body;
    const row = await assetService.updateAsset(assetId, req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 200, "Asset updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteAsset(req, res) {
  try {
    const { assetId } = req.query;
    await assetService.deleteAsset(assetId, req.user.defaultInstituteId);
    return SuccessResponse(res, 200, `Asset deleted successfully (ID ${assetId})`, null);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteAssetInventoryItem(req, res) {
  try {
    const { assetInventoryItemId } = req.query;
    await assetService.deleteAssetInventoryItem(
      assetInventoryItemId,
      req.user.defaultInstituteId
    );
    return SuccessResponse(
      res,
      200,
      `Asset inventory item deleted successfully (ID ${assetInventoryItemId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
