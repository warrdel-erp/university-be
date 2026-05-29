import * as assetIssueService from "../services/assetIssueServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addAssetIssue(req, res) {
  try {
    const row = await assetIssueService.createAssetIssue(req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 201, "Asset issue created successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllAssetIssues(req, res) {
  try {
    const { data, pagination } = await assetIssueService.listAssetIssues(
      req.user.defaultInstituteId,
      req.query
    );
    return SuccessResponse(res, 200, "Asset issues fetched successfully", data, pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleAssetIssue(req, res) {
  try {
    const { assetIssueId } = req.query;
    const data = await assetIssueService.getSingleAssetIssue(
      assetIssueId,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "Asset issue fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateAssetIssue(req, res) {
  try {
    const { assetIssueId } = req.body;
    const data = await assetIssueService.updateAssetIssue(
      assetIssueId,
      req.body,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "Asset issue updated successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
