import * as amcContractService from "../services/amcContractServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addAmcContract(req, res) {
  try {
    const row = await amcContractService.addAmcContract(req.body, req.user.defaultInstituteId);
    return SuccessResponse(res, 201, "AMC contract added successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllAmcContract(req, res) {
  try {
    const result = await amcContractService.listAmcContracts(
      req.user.defaultInstituteId,
      req.query
    );
    return SuccessResponse(res, 200, "AMC contracts fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSingleAmcContractDetails(req, res) {
  try {
    const { amcContractId } = req.query;
    const row = await amcContractService.getSingleAmcContract(
      amcContractId,
      req.user.defaultInstituteId
    );
    if (!row) {
      return ErrorResponse(res, 404, "AMC contract not found");
    }
    return SuccessResponse(res, 200, "AMC contract fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateAmcContract(req, res) {
  try {
    const { amcContractId } = req.body;
    const row = await amcContractService.updateAmcContract(
      amcContractId,
      req.body,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "AMC contract updated successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteAmcContract(req, res) {
  try {
    const { amcContractId } = req.query;
    await amcContractService.deleteAmcContract(amcContractId, req.user.defaultInstituteId);
    return SuccessResponse(
      res,
      200,
      `AMC contract deleted successfully (ID ${amcContractId})`,
      null
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function previewAmcContractNumber(req, res) {
  try {
    const row = await amcContractService.previewContractNumber(req.user.defaultInstituteId);
    return SuccessResponse(res, 200, "AMC contract number preview fetched successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAmcContractSummary(req, res) {
  try {
    const data = await amcContractService.getAmcContractSummary(req.user.defaultInstituteId);
    return SuccessResponse(res, 200, "AMC contract summary fetched successfully", data);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function submitAmcContractForApproval(req, res) {
  try {
    const { amcContractId } = req.body;
    const row = await amcContractService.submitAmcContractForApproval(
      amcContractId,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "AMC contract submitted for approval successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function approveAmcContract(req, res) {
  try {
    const { amcContractId } = req.body;
    const row = await amcContractService.approveAmcContract(
      amcContractId,
      req.user.defaultInstituteId
    );
    return SuccessResponse(res, 200, "AMC contract approved successfully", row);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}
