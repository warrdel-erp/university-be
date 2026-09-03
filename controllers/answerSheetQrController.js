import * as answerSheetQrServices from "../services/answerSheetQrServices.js";
import * as answerSheetSplitterServices from "../services/answerSheetSplitterServices.js";
import { ErrorResponse, SuccessResponse } from "../utility/response.js";
import {
  emptyEvaluationSummary,
  emptyPagination,
  validateEmployeeUser,
} from "../utility/employeeValidation.js";
import * as s3Helper from "../utility/s3Helper.js";
import * as s3FileRepository from "../repository/s3FileRepository.js";
import * as examSessionAnswerSheetRepository from "../repository/examSessionAnswerSheetRepository.js";
import * as pdfSplitJobRepository from "../repository/pdfSplitJobRepository.js";

export async function generateAnswerSheetQrBulk(req, res) {
  try {
    const { count } = req.body;
    const result = await answerSheetQrServices.generateBulkAnswerSheetQr(Number(count));

    return SuccessResponse(res, 201, "Answer sheet QR codes generated successfully", result);
  } catch (error) {
    console.error("Error in generateAnswerSheetQrBulk controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Unable to generate answer sheet QR codes");
  }
}

export async function mapAnswerSheetQr(req, res) {
  try {
    const { qr, studentId, examScheduleId } = req.body;

    const result = await answerSheetQrServices.mapAnswerSheetQr(
      qr,
      studentId,
      examScheduleId,
    );

    return SuccessResponse(res, 200, "QR code mapped successfully", result);
  } catch (error) {
    console.error("Error in mapAnswerSheetQr controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAnswerSheetQrById(req, res) {
  try {
    const { id } = req.params;

    const result = await answerSheetQrServices.getAnswerSheetQrDetailById(Number(id));

    return SuccessResponse(res, 200, "Answer sheet QR details fetched successfully", result);
  } catch (error) {
    console.error("Error in getAnswerSheetQrById controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAnswerSheetQrGenerationRequests(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await answerSheetQrServices.getAnswerSheetQrGenerationRequests(
      page,
      limit,
    );

    return SuccessResponse(
      res,
      200,
      "Answer sheet QR generation requests fetched successfully",
      result.data,
      result.paginationData,
    );
  } catch (error) {
    console.error("Error in getAnswerSheetQrGenerationRequests controller:", error);

    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAnswerSheetQrsByRequestId(req, res) {
  try {
    const { requestId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await answerSheetQrServices.getAnswerSheetQrsByRequestId(
      requestId,
      page,
      limit,
    );

    return SuccessResponse(
      res,
      200,
      "Answer sheet QRs fetched by request successfully",
      result.data,
      result.pagination,
    );
  } catch (error) {
    console.error("Error in getAnswerSheetQrsByRequestId controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function assignAnswerSheetsToTeachers(req, res) {
  try {
    const { assignedToUserId, answerSheetQrIds } = req.body;

    const result = await answerSheetQrServices.assignAnswerSheetsToTeachers(
      assignedToUserId,
      answerSheetQrIds,
    );

    return SuccessResponse(res, 200, "Answer sheets assigned to teachers successfully", result);
  } catch (error) {
    console.error("Error in assignAnswerSheetsToTeachers controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMyAssignedScripts(req, res) {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return ErrorResponse(res, validation.status, validation.message);
    }

    const { page = 1, limit = 20 } = req.query;
    if (!validation.employeeRecord) {
      return SuccessResponse(
        res,
        200,
        "Assigned scripts fetched successfully",
        {
          filteredrows: [],
          teacher: {
            userId: validation.userId,
            userName: req.user?.userName || null,
            email: req.user?.email || null,
          },
        },
        emptyPagination(page, limit),
      );
    }

    const result = await answerSheetQrServices.getScriptsAssignedToTeacher(
      validation.userId,
      page,
      limit,
    );

    return SuccessResponse(res, 200, "Assigned scripts fetched successfully", result.data, result.pagination);
  } catch (error) {
    console.error("Error in getMyAssignedScripts controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMyEvaluationSummary(req, res) {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return ErrorResponse(res, validation.status, validation.message);
    }
    if (!validation.employeeRecord) {
      return SuccessResponse(res, 200, "Evaluation summary fetched successfully", emptyEvaluationSummary());
    }

    const result = await answerSheetQrServices.getScriptsAssignedToTeacher(validation.userId, 1, 10000);
    const rows = result.data?.filteredrows || [];
    let evaluated = 0;

    for (const row of rows) {
      if (row.evaluatedAt != null) {
        evaluated += 1;
      }
    }

    return SuccessResponse(res, 200, "Evaluation summary fetched successfully", {
      totalAssigned: rows.length,
      evaluated,
      pending: rows.length - evaluated,
    });
  } catch (error) {
    console.error("Error in getMyEvaluationSummary controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getScriptsAssignedToTeacher(req, res) {
  try {
    const { assignedToUserId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await answerSheetQrServices.getScriptsAssignedToTeacher(
      assignedToUserId,
      page,
      limit,
    );

    return SuccessResponse(res, 200, "Assigned scripts fetched successfully", result.data, result.pagination);
  } catch (error) {
    console.error("Error in getScriptsAssignedToTeacher controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function assignObtainedMarksToAnswerSheet(req, res) {
  try {
    const { id } = req.params;
    const { obtained_marks } = req.body;

    const result = await answerSheetQrServices.assignObtainedMarksToAnswerSheet(
      Number(id),
      Number(obtained_marks),
    );

    return SuccessResponse(res, 200, "Obtained marks assigned successfully", result);
  } catch (error) {
    console.error("Error in assignObtainedMarksToAnswerSheet controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function splitAnswerSheetPdf(req, res) {
  try {
    const fileUploadId = req.body.answerSheetS3FileId;

    // Find FileUpload record to get the S3 key
    const fileRecord = await s3FileRepository.getS3FileById(fileUploadId);
    if (!fileRecord) {
      return ErrorResponse(res, 404, "File upload record not found.");
    }

    // ── Pre-flight Check 0: Ensure the file is actually a PDF ──────────────
    if (fileRecord.mime !== "application/pdf") {
      return ErrorResponse(
        res,
        400,
        `The specified file is not a PDF (detected MIME: ${fileRecord.mime}). ` +
          `Please upload a valid PDF and confirm the upload before splitting.`,
      );
    }

    const s3Key = fileRecord.s3Key;

    // ── Pre-flight Check 1: No other split job currently in progress ─────────
    const activeTempFiles = answerSheetSplitterServices.checkActiveSplitTempFiles();
    if (activeTempFiles) {
      return ErrorResponse(
        res,
        409,
        "Another PDF split job is currently in progress. " +
          "Please wait for it to complete before submitting a new one.",
      );
    }

    // ── Pre-flight Check 2: Verify file exists in S3 + get its size ──────────
    console.log(`[splitAnswerSheetPdf] Verifying file in S3: ${s3Key}`);
    let fileInfo;
    try {
      fileInfo = await s3Helper.verifyFileInS3(s3Key);
    } catch {
      return ErrorResponse(res, 404, "The specified PDF file was not found in storage.");
    }

    // ── Pre-flight Check 3: Ensure ≥ 2× file size of free disk space ─────────
    const requiredBytes = fileInfo.size * 2;
    const diskCheck = await answerSheetSplitterServices.checkDiskSpace(requiredBytes);
    if (!diskCheck.sufficient) {
      const freeMB = Math.round(diskCheck.freeBytes / (1024 * 1024));
      const requiredMB = Math.round(requiredBytes / (1024 * 1024));
      return ErrorResponse(
        res,
        507,
        `Insufficient disk space to process this PDF. ` +
          `Required: ${requiredMB} MB, Available: ${freeMB} MB. ` +
          `Please free up space and try again.`,
      );
    }

    // ── Resolve answer-sheet row ───────────────────────────────────────────────
    const answerSheet = await examSessionAnswerSheetRepository.findByS3FileId(fileUploadId);

    // ── Guard: block re-split if already completed successfully ───────────────
    if (answerSheet) {
      const successJob = await pdfSplitJobRepository.findSuccessfulJobByAnswerSheetId(answerSheet.id);
      if (successJob) {
        return ErrorResponse(
          res,
          409,
          `This file has already been split successfully (job: ${successJob.id}, status: ${successJob.status}). ` +
          `Re-splitting a completed answer sheet is not allowed.`
        );
      }
    }

    // ── Enqueue the job ───────────────────────────────────────────────────────
    const { jobId, jobDbId } = await answerSheetSplitterServices.enqueuePdfSplitJob(
      s3Key,
      req.user.userId,
      answerSheet?.id ?? null,
    );

    return SuccessResponse(res, 202, "PDF split job queued successfully. Poll the status endpoint to track progress.", {
      jobId,
      jobDbId,
      statusUrl: `/answerSheetQr/splitPdf/job/${jobDbId}`,
    });
  } catch (error) {
    console.error("Error in splitAnswerSheetPdf controller:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "An unexpected error occurred while queuing the PDF split job.",
    );
  }
}

export async function getSplitPdfJobStatus(req, res) {
  try {
    const { jobDbId } = req.params;

    const jobStatus = await answerSheetSplitterServices.getPdfSplitJobStatus(jobDbId);

    if (!jobStatus) {
      return ErrorResponse(res, 404, `No PDF split job found with ID: ${jobDbId}`);
    }

    return SuccessResponse(res, 200, "PDF split job status fetched successfully.", jobStatus);
  } catch (error) {
    console.error("Error in getSplitPdfJobStatus controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getMappedAnswerSheetsByExamSession(req, res) {
  try {
    const { data, pagination } =
      await answerSheetQrServices.getMappedAnswerSheetsByExamSession(req.query);

    return SuccessResponse(
      res,
      200,
      "Mapped answer sheets fetched successfully",
      data,
      pagination,
    );
  } catch (error) {
    console.error("Error in getMappedAnswerSheetsByExamSession:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch mapped answer sheets",
    );
  }
}
