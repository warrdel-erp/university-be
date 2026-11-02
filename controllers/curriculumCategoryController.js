import * as curriculumCategoryService from "../services/curriculumCategoryServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addCurriculumCategory(req, res) {
  try {
    const result = await curriculumCategoryService.addCurriculumCategory(req.body);
    return SuccessResponse(res, 201, "Curriculum category created successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllCurriculumCategories(req, res) {
  try {
    const result = await curriculumCategoryService.getAllCurriculumCategories(req.query);
    return SuccessResponse(
      res,
      200,
      "Curriculum categories fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCurriculumCategoryById(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumCategoryId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await curriculumCategoryService.getCurriculumCategoryById(id);
    return SuccessResponse(res, 200, "Curriculum category fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateCurriculumCategory(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumCategoryId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await curriculumCategoryService.updateCurriculumCategory(id, req.body);
    return SuccessResponse(res, 200, "Curriculum category updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteCurriculumCategory(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumCategoryId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    await curriculumCategoryService.deleteCurriculumCategory(id);
    return SuccessResponse(res, 200, `Curriculum category deleted successfully (ID ${id})`, null);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

