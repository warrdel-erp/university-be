import * as assetLocationService from "../services/assetLocationServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addAssetLocation(req, res) {
  try {
    const row = await assetLocationService.addAssetLocation(req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 201, "Asset location added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllAssetLocation(req, res) {
  try {
    const rows = await assetLocationService.listAssetLocations(req.user.defaultInstituteId);
    return SuccessResponse(res, 200, "Asset locations fetched successfully", rows);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleAssetLocationDetails(req, res) {
  try {
    const { assetLocationId } = req.query;
    const row = await assetLocationService.getSingleAssetLocation(
      assetLocationId,
      req.user.defaultInstituteId
    );
    if (!row) {
      return ErrorResponse(res, 404, "Asset location not found");
    }
    return SuccessResponse(res, 200, "Asset location fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateAssetLocation(req, res) {
  try {
    const { assetLocationId } = req.body;
    const row = await assetLocationService.updateAssetLocation(
      assetLocationId,
      req.body,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "Asset location updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteAssetLocation(req, res) {
  try {
    const { assetLocationId } = req.query;
    await assetLocationService.deleteAssetLocation(assetLocationId, req.user.defaultInstituteId);
    return SuccessResponse(
      res,
      200,
      `Asset location deleted successfully (ID ${assetLocationId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
