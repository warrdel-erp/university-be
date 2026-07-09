import * as InternalAssessmentServices from "../services/internalAssessmentService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addInternalAssessment(req, res) {
  const {
    subjectId,
    term,
    examSetupTypeId,
    type,
    totalMarks,
    weightage,
    publishDate,
    dueDate,
    description,
    userId,
  } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const file = req.files;

  if (
    !subjectId ||
    term == null ||
    !examSetupTypeId ||
    !type ||
    !totalMarks ||
    !publishDate ||
    !dueDate ||
    !description
  ) {
    return ErrorResponse(res, 400, "Required fields are missing");
  }
  try {
    const data = {
      subjectId,
      term: Number(term),
      examSetupTypeId,
      type,
      totalMarks,
      weightage,
      publishDate,
      dueDate,
      description,
      createdBy,
      updatedBy,
      userId,
    };
    const assessment = await InternalAssessmentServices.addInternalAssessment(
      data,
      file,
    );
    return SuccessResponse(res, 201, "Internal Assessment created", assessment);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getAllInternalAssessment(req, res) {
  const { examSetupTypeId } = req.query;
  try {
    const list =
      await InternalAssessmentServices.getAllInternalAssessment(
        examSetupTypeId,
      );
    return SuccessResponse(res, 200, "Internal Assessment list", list);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getSingleInternalAssessment(req, res) {
  const { examAssessmentId } = req.query;
  if (!examAssessmentId)
    return res.status(400).json({ message: "examAssessmentId is required" });
  try {
    const record =
      await InternalAssessmentServices.getInternalAssessmentById(
        examAssessmentId,
      );
    if (record)
      return SuccessResponse(res, 200, "Internal Assessment record", record);
    else return ErrorResponse(res, 404, "Not found");
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function updateInternalAssessments(req, res) {
  try {
    const payload = req.body;

    if (!Array.isArray(payload) || payload.length === 0) {
      return ErrorResponse(res, 400, "Request body must be a non-empty array.");
    }

    for (const item of payload) {
      if (!item.examAssessmentId) {
        return ErrorResponse(
          res,
          400,
          "Each item must include examAssessmentId.",
        );
      }
    }

    const updated =
      await InternalAssessmentServices.updateInternalAssessment(payload);

    return SuccessResponse(
      res,
      200,
      "Internal assessments updated successfully.",
      updated,
    );
  } catch (error) {
    return ErrorResponse(res, 500, error.message || "Something went wrong.");
  }
}

export async function deleteInternalAssessment(req, res) {
  const { examAssessmentId } = req.query;
  if (!examAssessmentId)
    return res.status(400).json({ message: "examAssessmentId is required" });
  try {
    const deleted =
      await InternalAssessmentServices.deleteInternalAssessment(
        examAssessmentId,
      );
    if (deleted) return SuccessResponse(res, 200, "Deleted");
    else return ErrorResponse(res, 404, "Not found");
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function evaluationInternalAssessment(req, res) {
  const { subjectId, userId } = req.query;
  if (!(subjectId && userId))
    return res
      .status(400)
      .json({ message: "subjectId,userId is required" });
  try {
    const record =
      await InternalAssessmentServices.evaluationInternalAssessment(
        subjectId,
        userId,
      );
    if (record) return SuccessResponse(res, 200, "Evaluation record", record);
    else return ErrorResponse(res, 404, "Not found data");
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function createAssessmentEvaluation(req, res) {
  try {
    const body = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    if (!body.subjectId || !body.userId || !body.examAssessmentId) {
      return ErrorResponse(
        res,
        400,
        "subjectId, userId, examAssessmentId are required",
      );
    }

    if (!Array.isArray(body.students) || body.students.length === 0) {
      return ErrorResponse(res, 400, "students array is required");
    }

    const response =
      await InternalAssessmentServices.createAssessmentEvaluation(
        body,
        createdBy,
        updatedBy,
      );

    return SuccessResponse(res, 201, "Evaluation saved successfully", response);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function updateAssessmentEvaluation(req, res) {
  try {
    const body = req.body;

    const result =
      await InternalAssessmentServices.updateAssessmentEvaluation(body);

    return SuccessResponse(
      res,
      200,
      "Assessment Evaluation updated successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}
