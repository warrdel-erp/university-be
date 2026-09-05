import * as examResultServices from "../services/examResultServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function listStudents(req, res) {
  try {
    const result = await examResultServices.listStudents(req.query);
    return SuccessResponse(
      res,
      200,
      "Exam result students fetched successfully",
      result.data,
      result.pagination,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch exam result students",
    );
  }
}

export async function getStudentById(req, res) {
  try {
    const result = await examResultServices.getStudentById(
      req.params.studentId,
      req.query,
    );
    return SuccessResponse(
      res,
      200,
      "Exam result student fetched successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch exam result student",
    );
  }
}

export async function getSku(req, res) {
  try {
    const result = await examResultServices.getSku(req.query);
    return SuccessResponse(
      res,
      200,
      "Exam result SKU fetched successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch exam result SKU",
    );
  }
}

export async function createExaminationSessionResult(req, res) {
  try {
    await examResultServices.createExaminationSessionResult(req.body);
    return SuccessResponse(res, 201, "result is saved and submitted");
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to create examination session result",
    );
  }
}

export async function getStudentResultDetails(req, res) {
  try {
    const result = await examResultServices.getStudentResultDetails(req.query);
    return SuccessResponse(
      res,
      200,
      "Student result fetched successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch student result",
    );
  }
}

export async function publishExaminationSessionResults(req, res) {
  try {
    const result = await examResultServices.publishExaminationSessionResults(
      req.body,
    );
    return SuccessResponse(res, 200, result.message);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to publish examination session results",
    );
  }
}

export async function getPublishHistory(req, res) {
  try {
    const result = await examResultServices.getPublishHistory(req.query);
    return SuccessResponse(
      res,
      200,
      "Publish history fetched successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch publish history",
    );
  }
}

export async function getPublishHistoryByBatchId(req, res) {
  try {
    const result = await examResultServices.getPublishHistoryByBatchId(
      req.params.publishBatchId,
    );
    return SuccessResponse(
      res,
      200,
      "Publish batch details fetched successfully",
      result,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch publish batch details",
    );
  }
}
