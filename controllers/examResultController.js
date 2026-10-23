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

export async function getCalculationBreakdown(req, res) {
  try {
    const payload = {
      ...req.body,
      examinationSessionId: req.body?.examinationSessionId ?? req.query?.examinationSessionId,
      gradingId: req.body?.gradingId ?? req.query?.gradingId,
      batchId: req.body?.batchId ?? req.query?.batchId,
      page: req.query?.page ?? req.body?.page,
      limit: req.query?.limit ?? req.body?.limit,
      search: req.query?.search ?? req.body?.search,
    };
    const result = await examResultServices.getCalculationBreakdown(payload);
    return SuccessResponse(
      res,
      200,
      "Calculation breakdown fetched successfully",
      result,
      result.pagination,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch calculation breakdown",
    );
  }
}

export async function getSubjectCalculationBreakdown(req, res) {
  try {
    const payload = {
      ...req.body,
      examinationSessionId: req.body?.examinationSessionId ?? req.query?.examinationSessionId,
      term: req.body?.term ?? req.query?.term,
      subjectId: req.body?.subjectId ?? req.query?.subjectId,
      examScheduleId: req.body?.examScheduleId ?? req.query?.examScheduleId,
      gradingId: req.body?.gradingId ?? req.query?.gradingId,
      batchId: req.body?.batchId ?? req.query?.batchId,
      studentIds: req.body?.studentIds ?? (req.query?.studentIds ? (Array.isArray(req.query.studentIds) ? req.query.studentIds : [req.query.studentIds]) : []),
      page: req.query?.page ?? req.body?.page,
      limit: req.query?.limit ?? req.body?.limit,
      search: req.query?.search ?? req.body?.search,
    };
    const result = await examResultServices.getSubjectCalculationBreakdown(payload);
    return SuccessResponse(
      res,
      200,
      "Subject calculation breakdown fetched successfully",
      result,
      result.pagination,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch subject calculation breakdown",
    );
  }
}

export async function getSubjectStudentsWithSubmittedAnswerSheets(req, res) {
  try {
    const payload = {
      ...req.body,
      examinationSessionId: req.body?.examinationSessionId ?? req.query?.examinationSessionId,
      subjectId: req.body?.subjectId ?? req.query?.subjectId,
      term: req.body?.term ?? req.query?.term,
      search: req.query?.search ?? req.body?.search,
      page: req.query?.page ?? req.body?.page,
      limit: req.query?.limit ?? req.body?.limit,
    };
    const result =
      await examResultServices.getSubjectStudentsWithSubmittedAnswerSheets(
        payload,
      );
    return SuccessResponse(
      res,
      200,
      "Subject students with submitted answer sheets fetched successfully",
      result,
      result.pagination,
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message ||
        "Failed to fetch subject students with submitted answer sheets",
    );
  }
}



