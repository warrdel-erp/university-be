import * as feeTypeCatalogService from "../services/feeTypeCatalogServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addFeeTypeCatalog(req, res) {
  try {
    const row = await feeTypeCatalogService.addFeeTypeCatalog(req.body);
    return SuccessResponse(res, 201, "Fee type catalog added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllFeeTypeCatalog(req, res) {
  try {
    const rows = await feeTypeCatalogService.listFeeTypeCatalogs();
    return SuccessResponse(res, 200, "Fee type catalog list fetched successfully", rows);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleFeeTypeCatalogDetails(req, res) {
  try {
    const { feeTypeCatalogId } = req.query;
    const row = await feeTypeCatalogService.getSingleFeeTypeCatalog(feeTypeCatalogId);
    if (!row) {
      return ErrorResponse(res, 404, "Fee type catalog not found");
    }
    return SuccessResponse(res, 200, "Fee type catalog fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateFeeTypeCatalog(req, res) {
  try {
    const { feeTypeCatalogId } = req.body;
    const row = await feeTypeCatalogService.updateFeeTypeCatalog(feeTypeCatalogId, req.body);
    return SuccessResponse(res, 200, "Fee type catalog updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteFeeTypeCatalog(req, res) {
  try {
    const { feeTypeCatalogId } = req.query;
    await feeTypeCatalogService.deleteFeeTypeCatalog(feeTypeCatalogId);
    return SuccessResponse(
      res,
      200,
      `Fee type catalog deleted successfully (ID ${feeTypeCatalogId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
