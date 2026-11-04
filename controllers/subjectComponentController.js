import * as subjectComponentService from "../services/subjectComponentServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addSubjectComponent(req, res) {
  try {
    const result = await subjectComponentService.addSubjectComponent(req.body);
    return SuccessResponse(res, 201, "Subject component created successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllSubjectComponents(req, res) {
  try {
    const result = await subjectComponentService.getAllSubjectComponents(req.query);
    return SuccessResponse(
      res,
      200,
      "Subject components fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getSubjectComponentById(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.subjectComponentId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await subjectComponentService.getSubjectComponentById(id);
    return SuccessResponse(res, 200, "Subject component fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateSubjectComponent(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.subjectComponentId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await subjectComponentService.updateSubjectComponent(id, req.body);
    return SuccessResponse(res, 200, "Subject component updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteSubjectComponent(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.subjectComponentId;
    const force = req.query.force === "true" || req.query.force === true;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    await subjectComponentService.deleteSubjectComponent(id, { force });
    return SuccessResponse(res, 200, `Subject component deleted successfully (ID ${id})`, null);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

