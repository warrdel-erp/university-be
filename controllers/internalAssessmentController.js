import * as InternalAssessmentServices from "../services/internalAssessmentService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function getUserInternalAssessments(req, res) {
  try {
    const userId = req.user.userId;
    const assessments =
      await InternalAssessmentServices.getUserInternalAssessments(userId, {
        search: req.query.search,
      });
    return SuccessResponse(
      res,
      200,
      "Fetched user internal assessments successfully",
      assessments,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      "Failed to fetch user internal assessments",
      error,
    );
  }
}

export async function createInternalAssessment(req, res) {
  try {
    const payload = req.body;
    payload.userId = req.user.userId;

    const assessment =
      await InternalAssessmentServices.createInternalAssessment(payload);

    return SuccessResponse(
      res,
      201,
      "Created internal assessment successfully",
      assessment,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      "Failed to create internal assessment",
      error,
    );
  }
}

export async function getInternalAssessmentsBySubject(req, res) {
  try {
    const assessments =
      await InternalAssessmentServices.getInternalAssessmentsBySubject(
        req.query,
      );

    return SuccessResponse(
      res,
      200,
      "Fetched internal assessments successfully",
      assessments,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      "Failed to fetch internal assessments",
      error,
    );
  }
}

export async function getInternalAssessmentById(req, res) {
  try {
    const assessment =
      await InternalAssessmentServices.getInternalAssessmentById(
        req.query.internalAssessmentId,
      );

    return SuccessResponse(
      res,
      200,
      "Fetched internal assessment successfully",
      assessment,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch internal assessment",
      error,
    );
  }
}

export async function getAssessmentStatusCounts(req, res) {
  try {
    const counts = await InternalAssessmentServices.getAssessmentStatusCounts({
      subjectId: req.query.subjectId,
      classSectionTermId: req.query.classSectionTermId,
      userId: req.user.userId,
    });

    return SuccessResponse(
      res,
      200,
      "Fetched assessment status counts successfully",
      counts,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch assessment status counts",
      error,
    );
  }
}

export async function getUserDashboardSku(req, res) {
  try {
    const sku = await InternalAssessmentServices.getUserDashboardSku(
      req.user.userId,
    );

    return SuccessResponse(
      res,
      200,
      "Fetched user dashboard SKU successfully",
      sku,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch user dashboard SKU",
      error,
    );
  }
}

export async function updateInternalAssessment(req, res) {
  try {
    const assessment =
      await InternalAssessmentServices.updateInternalAssessment(
        req.query.internalAssessmentId,
        req.body,
      );

    return SuccessResponse(
      res,
      200,
      "Updated internal assessment successfully",
      assessment,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to update internal assessment",
      error,
    );
  }
}

export async function getStudentEvaluations(req, res) {
  try {
    const evaluations = await InternalAssessmentServices.getStudentEvaluations(
      req.query.internalAssessmentId,
      req.query.studentId,
    );

    return SuccessResponse(
      res,
      200,
      "Fetched student evaluations successfully",
      evaluations,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch student evaluations",
      error,
    );
  }
}

export async function getMarksTableBySubject(req, res) {
  try {
    const table = await InternalAssessmentServices.getMarksTableBySubject(
      req.query,
    );

    return SuccessResponse(
      res,
      200,
      "Fetched marks table successfully",
      table,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch marks table",
      error,
    );
  }
}

export async function getStudentEvaluationByStudentAndAssessment(req, res) {
  try {
    const evaluation =
      await InternalAssessmentServices.getStudentEvaluationByStudentAndAssessment(
        req.query,
      );

    return SuccessResponse(
      res,
      200,
      "Fetched student evaluation successfully",
      evaluation,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch student evaluation",
      error,
    );
  }
}

export async function getStudentsByClassSectionTermId(req, res) {
  try {
    const students =
      await InternalAssessmentServices.getStudentsByClassSectionTermId(
        req.query.classSectionTermId,
      );

    return SuccessResponse(
      res,
      200,
      "Fetched students successfully",
      students,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch students",
      error,
    );
  }
}

export async function upsertStudentEvaluations(req, res) {
  try {
    const evaluations =
      await InternalAssessmentServices.upsertStudentEvaluations(
        req.query.internalAssessmentId,
        req.body.marks,
      );

    return SuccessResponse(
      res,
      200,
      "Saved student evaluations successfully",
      evaluations,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to save student evaluations",
      error,
    );
  }
}
