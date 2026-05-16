import * as feePlanProfileService from "../services/feePlanProfileServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addFeePlanProfile(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const row = await feePlanProfileService.addFeePlanProfile(req.body, instituteId);
    return SuccessResponse(res, 201, "Fee plan profile added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function lookupFeePlanProfiles(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const { courseSessionId } = req.query;
    const data = await feePlanProfileService.lookupFeePlanProfilesByCourseSession(
      courseSessionId,
      instituteId
    );
    return SuccessResponse(res, 200, "Fee plan profiles fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllFeePlanProfile(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const { courseSessionId } = req.query;
    const rows = await feePlanProfileService.listFeePlanProfiles(instituteId, courseSessionId);
    return SuccessResponse(res, 200, "Fee plan profiles fetched successfully", rows);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllFeePlanProfiles(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const data = await feePlanProfileService.listAllFeePlanProfiles(instituteId);
    return SuccessResponse(res, 200, "All fee plan profiles fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getFeePlanProfileSummary(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const data = await feePlanProfileService.getFeePlanProfileSummary(instituteId);
    return SuccessResponse(res, 200, "Fee plan summary fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleFeePlanProfileDetails(req, res) {
  try {
    const { feePlanProfileId } = req.query;
    const instituteId = req.user.defaultInstituteId;
    const row = await feePlanProfileService.getSingleFeePlanProfile(
      feePlanProfileId,
      instituteId
    );
    if (!row) {
      return ErrorResponse(res, 404, "Fee plan profile not found");
    }
    return SuccessResponse(res, 200, "Fee plan profile fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateFeePlanProfile(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const row = await feePlanProfileService.updateFeePlanProfile(req.body, instituteId);
    return SuccessResponse(res, 200, "Fee plan profile updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
