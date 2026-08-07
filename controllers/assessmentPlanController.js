import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import * as assessmentPlanService from "../services/assessmentPlanService.js";

export async function createAssessmentPlan(req, res) {
  try {
    const result = await assessmentPlanService.createAssessmentPlan({
      payload: req.body,
      user: req.user,
    });
    return SuccessResponse(res, 201, "Assessment plan created successfully", result);
  } catch (error) {
    console.error("Error in createAssessmentPlan:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create assessment plan");
  }
}

export async function getAssessmentPlans(req, res) {
  try {
    const result = await assessmentPlanService.getAssessmentPlans(req.query, req.user);
    return SuccessResponse(res, 200, "Assessment plans fetched successfully", result);
  } catch (error) {
    console.error("Error in getAssessmentPlans:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch assessment plans");
  }
}

export async function getAssessmentPlanById(req, res) {
  try {
    const { assessmentPlanId } = req.params;
    const result = await assessmentPlanService.getAssessmentPlanById(assessmentPlanId);
    return SuccessResponse(res, 200, "Assessment plan fetched successfully", result);
  } catch (error) {
    console.error("Error in getAssessmentPlanById:", error.message);
    return ErrorResponse(res, error.statusCode || 404, error.message || "Assessment plan not found");
  }
}

export async function updateAssessmentPlan(req, res) {
  try {
    const { assessmentPlanId } = req.params;
    const result = await assessmentPlanService.updateAssessmentPlan({
      assessmentPlanId,
      payload: req.body,
      user: req.user,
    });
    return SuccessResponse(res, 200, "Assessment plan updated successfully", result);
  } catch (error) {
    console.error("Error in updateAssessmentPlan:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update assessment plan");
  }
}

export async function deleteAssessmentPlan(req, res) {
  try {
    const { assessmentPlanId } = req.params;
    const result = await assessmentPlanService.deleteAssessmentPlan(assessmentPlanId);
    return SuccessResponse(res, 200, result.message || "Assessment plan status updated successfully", result);
  } catch (error) {
    console.error("Error in deleteAssessmentPlan:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update assessment plan status");
  }
}

export async function createAssessmentPlanComponent(req, res) {
  try {
    const result = await assessmentPlanService.createAssessmentPlanComponent({
      payload: req.body,
      user: req.user,
    });
    return SuccessResponse(res, 201, "Assessment plan component created successfully", result);
  } catch (error) {
    console.error("Error in createAssessmentPlanComponent:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create assessment plan component");
  }
}

export async function updateAssessmentPlanComponent(req, res) {
  try {
    const { assessmentPlanComponentId } = req.params;
    const result = await assessmentPlanService.updateAssessmentPlanComponent({
      assessmentPlanComponentId,
      payload: req.body,
      user: req.user,
    });
    return SuccessResponse(res, 200, "Assessment plan component updated successfully", result);
  } catch (error) {
    console.error("Error in updateAssessmentPlanComponent:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to update assessment plan component");
  }
}

export async function deleteAssessmentPlanComponent(req, res) {
  try {
    const { assessmentPlanComponentId } = req.params;
    const result = await assessmentPlanService.deleteAssessmentPlanComponent(assessmentPlanComponentId);
    return SuccessResponse(res, 200, result.message || "Assessment plan component deleted successfully", result);
  } catch (error) {
    console.error("Error in deleteAssessmentPlanComponent:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to delete assessment plan component");
  }
}

export async function getCourseAssessmentPlanOverview(req, res) {
  try {
    const result = await assessmentPlanService.getCourseAssessmentPlanOverview(req.query);
    return SuccessResponse(res, 200, "Course assessment plan overview fetched successfully", result);
  } catch (error) {
    console.error("Error in getCourseAssessmentPlanOverview:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch course assessment plan overview");
  }
}

export async function getAssessmentPlanStats(req, res) {
  try {
    const result = await assessmentPlanService.getAssessmentPlanStats(req.query);
    return SuccessResponse(res, 200, "Assessment plan statistics fetched successfully", result);
  } catch (error) {
    console.error("Error in getAssessmentPlanStats:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch assessment plan statistics");
  }
}

export async function createAssessmentPlanSubjectMapping(req, res) {
  try {
    const result = await assessmentPlanService.createAssessmentPlanSubjectMapping({
      payload: req.body,
      user: req.user,
    });
    return SuccessResponse(res, 201, "Subject assessment plan mapping created successfully", result);
  } catch (error) {
    console.error("Error in createAssessmentPlanSubjectMapping:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to create subject assessment plan mapping");
  }
}

export async function getAssessmentPlanSubjectMappings(req, res) {
  try {
    const result = await assessmentPlanService.getAssessmentPlanSubjectMappings(req.query);
    return SuccessResponse(res, 200, "Subject assessment plan mappings fetched successfully", result);
  } catch (error) {
    console.error("Error in getAssessmentPlanSubjectMappings:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to fetch subject assessment plan mappings");
  }
}

export async function deleteAssessmentPlanSubjectMapping(req, res) {
  try {
    const { mappingId } = req.params;
    const result = await assessmentPlanService.deleteAssessmentPlanSubjectMapping(mappingId);
    return SuccessResponse(res, 200, result.message || "Subject assessment plan mapping deleted successfully", result);
  } catch (error) {
    console.error("Error in deleteAssessmentPlanSubjectMapping:", error.message);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Failed to delete subject assessment plan mapping");
  }
}
