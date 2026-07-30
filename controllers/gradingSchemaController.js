import * as gradingSchemaService from "../services/gradingSchemaService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createGradingSchema(req, res) {
  try {
    const data = req.body;
    const user = req.user;

    const result = await gradingSchemaService.createGradingSchema(data, user);
    return SuccessResponse(res, 201, "Grading schema created successfully", result);
  } catch (error) {
    console.error("Error in createGradingSchema:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create grading schema");
  }
}

export async function getGradingSchemas(req, res) {
  try {
    const filters = req.query;
    const result = await gradingSchemaService.getGradingSchemas(filters);

    return SuccessResponse(res, 200, "Grading schemas fetched successfully", result.data, {
      page: result.currentPage,
      limit: result.pageSize,
      total: result.totalRecords,
    });
  } catch (error) {
    console.error("Error in getGradingSchemas:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch grading schemas");
  }
}

export async function getGradingSchemaById(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const result = await gradingSchemaService.getGradingSchemaById(gradingSchemaId);

    return SuccessResponse(res, 200, "Grading schema fetched successfully", result);
  } catch (error) {
    console.error("Error in getGradingSchemaById:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch grading schema");
  }
}

export async function updateGradingSchema(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const data = req.body;
    const user = req.user;

    const result = await gradingSchemaService.updateGradingSchema(gradingSchemaId, data, user);

    return SuccessResponse(res, 200, "Grading schema updated successfully", result);
  } catch (error) {
    console.error("Error in updateGradingSchema:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update grading schema");
  }
}

export async function deleteGradingSchema(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const result = await gradingSchemaService.deleteGradingSchema(gradingSchemaId);

    return SuccessResponse(res, 200, result.message || "Grading schema deleted successfully");
  } catch (error) {
    console.error("Error in deleteGradingSchema:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to delete grading schema");
  }
}

export async function createGradingSchemaGrade(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const data = req.body;
    const result = await gradingSchemaService.createGradingSchemaGrade(gradingSchemaId, data);

    return SuccessResponse(res, 201, "Grade created successfully", result);
  } catch (error) {
    console.error("Error in createGradingSchemaGrade:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create grade");
  }
}

export async function getGradingSchemaGrades(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const result = await gradingSchemaService.getGradingSchemaGrades(gradingSchemaId);

    return SuccessResponse(res, 200, "Grades fetched successfully", result);
  } catch (error) {
    console.error("Error in getGradingSchemaGrades:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch grades");
  }
}

export async function getGradingSchemaGradeById(req, res) {
  try {
    const { gradingSchemaId, gradingSchemaGradeId } = req.params;
    const result = await gradingSchemaService.getGradingSchemaGradeById(gradingSchemaId, gradingSchemaGradeId);

    return SuccessResponse(res, 200, "Grade fetched successfully", result);
  } catch (error) {
    console.error("Error in getGradingSchemaGradeById:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch grade");
  }
}

export async function updateGradingSchemaGrade(req, res) {
  try {
    const { gradingSchemaId, gradingSchemaGradeId } = req.params;
    const data = req.body;
    const result = await gradingSchemaService.updateGradingSchemaGrade(gradingSchemaId, gradingSchemaGradeId, data);

    return SuccessResponse(res, 200, "Grade updated successfully", result);
  } catch (error) {
    console.error("Error in updateGradingSchemaGrade:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update grade");
  }
}

export async function deleteGradingSchemaGrade(req, res) {
  try {
    const { gradingSchemaId, gradingSchemaGradeId } = req.params;
    const result = await gradingSchemaService.deleteGradingSchemaGrade(gradingSchemaId, gradingSchemaGradeId);

    return SuccessResponse(res, 200, result.message || "Grade deleted successfully");
  } catch (error) {
    console.error("Error in deleteGradingSchemaGrade:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to delete grade");
  }
}

export async function publishGradingSchema(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const user = req.user;
    const result = await gradingSchemaService.publishGradingSchema(gradingSchemaId, user);

    return SuccessResponse(res, 200, "Grading schema published successfully", result);
  } catch (error) {
    console.error("Error in publishGradingSchema:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to publish grading schema");
  }
}

export async function saveGradingSchemaDraft(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const user = req.user;
    const result = await gradingSchemaService.saveGradingSchemaDraft(gradingSchemaId, user);

    return SuccessResponse(res, 200, "Grading schema saved as draft successfully", result);
  } catch (error) {
    console.error("Error in saveGradingSchemaDraft:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to save grading schema draft");
  }
}
