import * as feePolicyService from "../services/feePolicyServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createFeePolicy(req, res) {
  try {
    const policy = await feePolicyService.createFeePolicy(req.body, req.user);
    return SuccessResponse(res, 201, "Fee policy created successfully", policy);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getFeePolicies(req, res) {
  try {
    const data = await feePolicyService.getFeePolicies(req.query);
    return SuccessResponse(res, 200, "Fee policies fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleFeePolicy(req, res) {
  try {
    const feePolicyId = req.query.feePolicyId || req.params.feePolicyId;
    const policy = await feePolicyService.getSingleFeePolicy(feePolicyId);
    return SuccessResponse(res, 200, "Fee policy details fetched successfully", policy);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateFeePolicy(req, res) {
  try {
    const feePolicyId = req.body.feePolicyId || req.query.feePolicyId;
    const policy = await feePolicyService.updateFeePolicy(feePolicyId, req.body, req.user);
    return SuccessResponse(res, 200, "Fee policy updated successfully", policy);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function publishFeePolicy(req, res) {
  try {
    const feePolicyId = req.body.feePolicyId || req.query.feePolicyId;
    const policy = await feePolicyService.publishFeePolicy(feePolicyId, req.user);
    return SuccessResponse(res, 200, "Fee policy published successfully", policy);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function unpublishFeePolicy(req, res) {
  try {
    const feePolicyId = req.body.feePolicyId || req.query.feePolicyId;
    const policy = await feePolicyService.unpublishFeePolicy(feePolicyId, req.user);
    return SuccessResponse(res, 200, "Fee policy unpublished successfully", policy);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteFeePolicy(req, res) {
  try {
    const feePolicyId = req.query.feePolicyId || req.params.feePolicyId;
    await feePolicyService.deleteFeePolicy(feePolicyId);
    return SuccessResponse(res, 200, `Fee policy deleted successfully (ID ${feePolicyId})`, null);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function mapStudentFeePolicy(req, res) {
  try {
    const data = await feePolicyService.mapStudentWithFeePolicies(req.body, req.user);
    return SuccessResponse(res, 201, "Student(s) mapped with fee policy successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function removeStudentFeePolicyMapping(req, res) {
  try {
    const data = await feePolicyService.removeStudentFeePolicyMapping(req.query, req.user);
    return SuccessResponse(res, 200, "Student fee policy mapping removed successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getStudentFeePolicies(req, res) {
  try {
    const data = await feePolicyService.getStudentFeePolicies(req.query, req.user);
    return SuccessResponse(res, 200, "Student fee policy mappings fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getFeePolicyImpact(req, res) {
  try {
    const data = await feePolicyService.calculateFeePolicyImpact(req.query, req.user);
    return SuccessResponse(res, 200, "Fee policy impact fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
