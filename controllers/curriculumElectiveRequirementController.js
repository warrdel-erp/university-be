import * as service from "../services/curriculumElectiveRequirementServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addCurriculumElectiveRequirement(req, res) {
  try {
    const result = await service.addCurriculumElectiveRequirement(req.body);
    return SuccessResponse(res, 201, "Curriculum elective requirement created successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllCurriculumElectiveRequirements(req, res) {
  try {
    const result = await service.getAllCurriculumElectiveRequirements(req.query);
    return SuccessResponse(
      res,
      200,
      "Curriculum elective requirements fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCurriculumElectiveRequirementById(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.getCurriculumElectiveRequirementById(id);
    return SuccessResponse(res, 200, "Curriculum elective requirement fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateCurriculumElectiveRequirement(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.updateCurriculumElectiveRequirement(id, req.body);
    return SuccessResponse(res, 200, "Curriculum elective requirement updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function toggleStatusCurriculumElectiveRequirement(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.toggleStatusCurriculumElectiveRequirement(id);
    return SuccessResponse(res, 200, "Curriculum elective requirement status toggled successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteCurriculumElectiveRequirement(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    await service.deleteCurriculumElectiveRequirement(id);
    return SuccessResponse(res, 200, "Curriculum elective requirement deleted successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

