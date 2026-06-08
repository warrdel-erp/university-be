import * as amcVendorService from "../services/amcVendorServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addAmcVendor(req, res) {
  try {
    const row = await amcVendorService.addAmcVendor(req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 201, "AMC vendor added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllAmcVendor(req, res) {
  try {
    const result = await amcVendorService.listAmcVendors(req.user.defaultInstituteId, req.query);
    return SuccessResponse(res, 200, "AMC vendors fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleAmcVendorDetails(req, res) {
  try {
    const { amcVendorId } = req.query;
    const row = await amcVendorService.getSingleAmcVendor(
      amcVendorId,
      req.user.defaultInstituteId
    );
    if (!row) {
      return ErrorResponse(res, 404, "AMC vendor not found");
    }
    return SuccessResponse(res, 200, "AMC vendor fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateAmcVendor(req, res) {
  try {
    const { amcVendorId } = req.body;
    const row = await amcVendorService.updateAmcVendor(
      amcVendorId,
      req.body,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "AMC vendor updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteAmcVendor(req, res) {
  try {
    const { amcVendorId } = req.query;
    await amcVendorService.deleteAmcVendor(amcVendorId, req.user.defaultInstituteId);
    return SuccessResponse(
      res,
      200,
      `AMC vendor deleted successfully (ID ${amcVendorId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function previewAmcVendorCode(req, res) {
  try {
    const { vendorName, assetCategoryId } = req.body;
    const row = await amcVendorService.previewVendorCode(
      vendorName,
      assetCategoryId,
      req.user.defaultInstituteId
    );

    if (row.vendorNameExists) {
      return SuccessResponse(
        res,
        200,
        `Vendor name "${row.vendorName}" already exists in your institute. Use a different full vendor name.`,
        row
      );
    }

    if (row.vendorCodeExists) {
      return SuccessResponse(
        res,
        200,
        "Vendor code already exists. Please use a different full vendor name.",
        row
      );
    }

    return SuccessResponse(res, 200, "AMC vendor code preview fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
