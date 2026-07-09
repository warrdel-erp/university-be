import * as feePlanProfileService from "../services/feePlanProfileServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addFeePlanProfile(req, res) {
  try {
    const row = await feePlanProfileService.addFeePlanProfile(req.body);
    return SuccessResponse(res, 201, "Fee plan profile added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateFeePlanProfile(req, res) {
  try {
    const row = await feePlanProfileService.updateFeePlanProfile(req.body);
    if (!row) {
      return ErrorResponse(res, 404, "Fee plan profile not found");
    }
    return SuccessResponse(res, 200, "Fee plan profile updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function publishFeePlanProfile(req, res) {
  try {
    const { feePlanProfileId } = req.body;
    const row = await feePlanProfileService.publishFeePlanProfile(feePlanProfileId);
    if (!row) {
      return ErrorResponse(res, 404, "Fee plan profile not found");
    }
    return SuccessResponse(res, 200, "Fee plan profile published successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllFeePlanProfile(req, res) {
  try {
    const { courseSessionId } = req.query;
    const rows = await feePlanProfileService.listFeePlanProfiles(courseSessionId);
    return SuccessResponse(res, 200, "Fee plan profiles fetched successfully", rows);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllFeePlanProfiles(req, res) {
  try {
    const status = req.query.status ?? "all";
    const data = await feePlanProfileService.listAllFeePlanProfiles(status);
    return SuccessResponse(res, 200, "All fee plan profiles fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getFeePlanProfileSummary(req, res) {
  try {
    const data = await feePlanProfileService.getFeePlanProfileSummary();
    return SuccessResponse(res, 200, "Fee plan summary fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleFeePlanProfileDetails(req, res) {
  try {
    const { feePlanProfileId } = req.query;
    const row = await feePlanProfileService.getSingleFeePlanProfile(feePlanProfileId);
    if (!row) {
      return ErrorResponse(res, 404, "Fee plan profile not found");
    }
    return SuccessResponse(res, 200, "Fee plan profile fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function assignFeePlanProfileToStudent(req, res) {
  try {
    const data = await feePlanProfileService.assignFeePlanProfileToStudent(req.body);
    return SuccessResponse(res, 200, "Fee plan profile assigned to student successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteFeePlanProfile(req, res) {
  try {
    const { feePlanProfileId } = req.query;
    const data = await feePlanProfileService.deleteFeePlanProfile(feePlanProfileId);
    return SuccessResponse(res, 200, "Fee plan profile deleted successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
