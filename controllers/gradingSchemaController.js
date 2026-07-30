import * as gradingSchemaService from "../services/gradingSchemaService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";


export async function createGradingSchema(req, res) {
  try {
    const data = req.body;
    const user = req.user;

    const result = await gradingSchemaService.createGradingSchema(data, user);

    new SuccessResponse(201, "Grading schema created successfully", result).send(res);
  } catch (error) {
    console.error("Error in createGradingSchema:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to create grading schema").send(res);
  }
}

export async function getGradingSchemas(req, res) {
  try {
    const filters = req.query;
    const result = await gradingSchemaService.getGradingSchemas(filters);

    new SuccessResponse(200, "Grading schemas fetched successfully", result).send(res);
  } catch (error) {
    console.error("Error in getGradingSchemas:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to fetch grading schemas").send(res);
  }
}

export async function getGradingSchemaById(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const result = await gradingSchemaService.getGradingSchemaById(gradingSchemaId);

    new SuccessResponse(200, "Grading schema fetched successfully", result).send(res);
  } catch (error) {
    console.error("Error in getGradingSchemaById:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to fetch grading schema").send(res);
  }
}

export async function updateGradingSchema(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const data = req.body;
    const user = req.user;

    const result = await gradingSchemaService.updateGradingSchema(gradingSchemaId, data, user);

    new SuccessResponse(200, "Grading schema updated successfully", result).send(res);
  } catch (error) {
    console.error("Error in updateGradingSchema:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to update grading schema").send(res);
  }
}

export async function deleteGradingSchema(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const result = await gradingSchemaService.deleteGradingSchema(gradingSchemaId);

    new SuccessResponse(200, result.message || "Grading schema deleted successfully", result).send(res);
  } catch (error) {
    console.error("Error in deleteGradingSchema:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to delete grading schema").send(res);
  }
}

export async function createGradingSchemaGrade(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const data = req.body;
    const result = await gradingSchemaService.createGradingSchemaGrade(gradingSchemaId, data);
    new SuccessResponse(201, "Grade created successfully", result).send(res);
  } catch (error) {
    console.error("Error in createGradingSchemaGrade:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to create grade").send(res);
  }
}

export async function getGradingSchemaGrades(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const result = await gradingSchemaService.getGradingSchemaGrades(gradingSchemaId);
    new SuccessResponse(200, "Grades fetched successfully", result).send(res);
  } catch (error) {
    console.error("Error in getGradingSchemaGrades:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to fetch grades").send(res);
  }
}

export async function getGradingSchemaGradeById(req, res) {
  try {
    const { gradingSchemaId, gradingSchemaGradeId } = req.params;
    const result = await gradingSchemaService.getGradingSchemaGradeById(gradingSchemaId, gradingSchemaGradeId);
    new SuccessResponse(200, "Grade fetched successfully", result).send(res);
  } catch (error) {
    console.error("Error in getGradingSchemaGradeById:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to fetch grade").send(res);
  }
}

export async function updateGradingSchemaGrade(req, res) {
  try {
    const { gradingSchemaId, gradingSchemaGradeId } = req.params;
    const data = req.body;
    const result = await gradingSchemaService.updateGradingSchemaGrade(gradingSchemaId, gradingSchemaGradeId, data);

  new SuccessResponse(200, "Grade updated successfully", result).send(res);
  } catch (error) {
    console.error("Error in updateGradingSchemaGrade:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to update grade").send(res);
  }
}

export async function deleteGradingSchemaGrade(req, res) {
  try {
    const { gradingSchemaId, gradingSchemaGradeId } = req.params;
    const result = await gradingSchemaService.deleteGradingSchemaGrade(gradingSchemaId, gradingSchemaGradeId);

    new SuccessResponse(200, "Grade deleted successfully", result).send(res);
  } catch (error) {
    console.error("Error in deleteGradingSchemaGrade:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to delete grade").send(res);
  }
}

export async function publishGradingSchema(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const user = req.user;
    const result = await gradingSchemaService.publishGradingSchema(gradingSchemaId, user);

  new SuccessResponse(200, "Grading schema published successfully", result).send(res);
  } catch (error) {
    console.error("Error in publishGradingSchema:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to publish grading schema").send(res);
  }
}

export async function saveGradingSchemaDraft(req, res) {
  try {
    const { gradingSchemaId } = req.params;
    const user = req.user;
    const result = await gradingSchemaService.saveGradingSchemaDraft(gradingSchemaId, user);
    new SuccessResponse(200, "Grading schema saved as draft successfully", result).send(res);
  } catch (error) {
    console.error("Error in saveGradingSchemaDraft:", error.message);
    new ErrorResponse(error.statusCode || 500, error.message || "Failed to save grading schema draft").send(res);
  }
}

