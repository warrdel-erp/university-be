import * as academicRegulationService from "../services/academicRegulationService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createAcademicRegulation(req, res) {
  try {
    const data = req.body;
    const user = req.user;

    const result = await academicRegulationService.createAcademicRegulation(data, user);
    return SuccessResponse(res, 201, "Academic regulation created successfully", result);
  } catch (error) {
    console.error("Error in createAcademicRegulation:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create academic regulation");
  }
}

export async function getAcademicRegulations(req, res) {
  try {
    const filters = req.query;
    const user = req.user;
    const result = await academicRegulationService.getAcademicRegulations(filters, user);

    return SuccessResponse(res, 200, "Academic regulations fetched successfully", result.data, {
      page: result.currentPage,
      limit: result.pageSize,
      total: result.totalRecords,
    });
  } catch (error) {
    console.error("Error in getAcademicRegulations:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch academic regulations");
  }
}

export async function getAcademicRegulationById(req, res) {
  try {
    const { academicRegulationId } = req.params;
    const result = await academicRegulationService.getAcademicRegulationById(academicRegulationId);

    return SuccessResponse(res, 200, "Academic regulation fetched successfully", result);
  } catch (error) {
    console.error("Error in getAcademicRegulationById:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch academic regulation");
  }
}

export async function updateAcademicRegulation(req, res) {
  try {
    const { academicRegulationId } = req.params;
    const data = req.body;
    const user = req.user;

    const result = await academicRegulationService.updateAcademicRegulation(academicRegulationId, data, user);

    return SuccessResponse(res, 200, "Academic regulation updated successfully", result);
  } catch (error) {
    console.error("Error in updateAcademicRegulation:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update academic regulation");
  }
}

export async function deleteAcademicRegulation(req, res) {
  try {
    const { academicRegulationId } = req.params;
    const result = await academicRegulationService.deleteAcademicRegulation(academicRegulationId);

    return SuccessResponse(res, 200, result.message || "Academic regulation status updated successfully", result);
  } catch (error) {
    console.error("Error in deleteAcademicRegulation:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update academic regulation status");
  }
}

export async function createCourseMapping(req, res) {
  try {
    const { academicRegulationId, batchId } = req.body;
    const result = await academicRegulationService.createCourseMapping(
      {
        academicRegulationId,
        batchId,
      },
      req.user
    );
    return SuccessResponse(res, 201, "Course mapping created successfully", result);
  } catch (error) {
    console.error("Error in createCourseMapping:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create course mapping");
  }
}

export async function getCourseMappings(req, res) {
  try {
    const filters = {
      ...req.query,
      ...(req.params.academicRegulationId && { academicRegulationId: req.params.academicRegulationId }),
    };
    const result = await academicRegulationService.getCourseMappings(filters);
    return SuccessResponse(res, 200, "Course mappings fetched successfully", result);
  } catch (error) {
    console.error("Error in getCourseMappings:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch course mappings");
  }
}

export async function deleteCourseMapping(req, res) {
  try {
    const { academicRegulationCourseMappingId } = req.params;
    const result = await academicRegulationService.deleteCourseMapping(academicRegulationCourseMappingId);
    return SuccessResponse(res, 200, result.message || "Course mapping deleted successfully");
  } catch (error) {
    console.error("Error in deleteCourseMapping:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to delete course mapping");
  }
}

export async function createAssessmentScheme(req, res) {
  try {
    const data = req.body;
    const user = req.user;
    const result = await academicRegulationService.createAssessmentScheme(data, user);
    return SuccessResponse(res, 201, "Assessment scheme created successfully", result);
  } catch (error) {
    console.error("Error in createAssessmentScheme:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create assessment scheme");
  }
}

export async function getAssessmentSchemes(req, res) {
  try {
    const filters = {
      ...req.query,
      ...(req.params.academicRegulationId && { academicRegulationId: req.params.academicRegulationId }),
    };
    const result = await academicRegulationService.getAssessmentSchemes(filters);
    return SuccessResponse(res, 200, "Assessment schemes fetched successfully", result);
  } catch (error) {
    console.error("Error in getAssessmentSchemes:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch assessment schemes");
  }
}

export async function getAssessmentSchemeById(req, res) {
  try {
    const { id } = req.params;
    const result = await academicRegulationService.getAssessmentSchemeById(id);
    return SuccessResponse(res, 200, "Assessment scheme fetched successfully", result);
  } catch (error) {
    console.error("Error in getAssessmentSchemeById:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch assessment scheme");
  }
}

export async function updateAssessmentScheme(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    const user = req.user;
    const result = await academicRegulationService.updateAssessmentScheme(id, data, user);
    return SuccessResponse(res, 200, "Assessment scheme updated successfully", result);
  } catch (error) {
    console.error("Error in updateAssessmentScheme:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update assessment scheme");
  }
}

export async function deleteAssessmentScheme(req, res) {
  try {
    const { id } = req.params;
    const result = await academicRegulationService.deleteAssessmentScheme(id);
    return SuccessResponse(res, 200, result.message || "Assessment scheme deleted successfully");
  } catch (error) {
    console.error("Error in deleteAssessmentScheme:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to delete assessment scheme");
  }
}

