import * as service from "../services/attendancePolicyService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function saveStep1(req, res) {
  try {
    const policyId = req.params.policyId ? Number(req.params.policyId) : req.body.policyId;
    const payload = { ...req.body, ...(policyId ? { policyId } : {}) };
    const result = await service.saveStep1(payload, req.user);
    const statusCode = req.params.policyId ? 200 : 201;
    return SuccessResponse(res, statusCode, "Step 1 (General & Applicability) saved successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function saveStep2(req, res) {
  try {
    const policyId = req.params.policyId || req.body.policyId;
    const result = await service.saveStep2(policyId, req.body, req.user);
    return SuccessResponse(res, 200, "Step 2 (Working Hours & Regularisation) saved successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function saveStep3(req, res) {
  try {
    const policyId = req.params.policyId || req.body.policyId;
    const result = await service.saveStep3(policyId, req.body, req.user);
    return SuccessResponse(res, 200, "Step 3 (Late Entry & Early Exit Rules) saved successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function publishPolicy(req, res) {
  try {
    const policyId = req.params.policyId;
    const result = await service.publishPolicy(policyId, req.user);
    return SuccessResponse(res, 200, "Attendance policy published successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSinglePolicy(req, res) {
  try {
    const policyId = req.params.policyId;
    const result = await service.getSinglePolicy(policyId);
    return SuccessResponse(res, 200, "Attendance policy details fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getPolicies(req, res) {
  try {
    const { items, pagination } = await service.getPolicies(req.query, req.user);
    return SuccessResponse(res, 200, "Attendance policies fetched successfully", items, pagination);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMetrics(req, res) {
  try {
    const result = await service.getMetrics(req.user);
    return SuccessResponse(res, 200, "Policy metrics fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function duplicatePolicy(req, res) {
  try {
    const policyId = req.params.policyId;
    const result = await service.duplicatePolicy(policyId, req.body, req.user);
    return SuccessResponse(res, 201, "Attendance policy duplicated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function createNewVersion(req, res) {
  try {
    const policyId = req.params.policyId;
    const result = await service.createNewVersion(policyId, req.body, req.user);
    return SuccessResponse(res, 201, "New policy version created successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function archivePolicy(req, res) {
  try {
    const policyId = req.params.policyId;
    const result = await service.archivePolicy(policyId, req.user);
    return SuccessResponse(res, 200, "Attendance policy archived successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deletePolicy(req, res) {
  try {
    const policyId = req.params.policyId;
    const result = await service.deletePolicy(policyId);
    return SuccessResponse(res, 200, "Attendance policy deleted successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
