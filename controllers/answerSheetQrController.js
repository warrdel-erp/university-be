import * as answerSheetQrServices from "../services/answerSheetQrServices.js";
import * as answerSheetSplitterServices from "../services/answerSheetSplitterServices.js";
import { ErrorResponse, SuccessResponse } from "../utility/response.js";
import * as s3Helper from "../utility/s3Helper.js";
import * as s3FileRepository from "../repository/s3FileRepository.js";

export async function generateAnswerSheetQrBulk(req, res) {
  try {
    const { count } = req.body;
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;

    const result = await answerSheetQrServices.generateBulkAnswerSheetQr(Number(count), instituteId, universityId);

    return SuccessResponse(res, 201, "Answer sheet QR codes generated successfully", result);
  } catch (error) {
    console.error("Error in generateAnswerSheetQrBulk controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Unable to generate answer sheet QR codes");
  }
}

export async function mapAnswerSheetQr(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { qr, studentId, examScheduleId } = req.body;

    const result = await answerSheetQrServices.mapAnswerSheetQr(
      qr,
      studentId,
      examScheduleId,
      instituteId,
      universityId,
    );

    return SuccessResponse(res, 200, "QR code mapped successfully", result);
  } catch (error) {
    console.error("Error in mapAnswerSheetQr controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAnswerSheetQrById(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { id } = req.params;

    const result = await answerSheetQrServices.getAnswerSheetQrDetailById(Number(id), instituteId, universityId);

    return SuccessResponse(res, 200, "Answer sheet QR details fetched successfully", result);
  } catch (error) {
    console.error("Error in getAnswerSheetQrById controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAnswerSheetQrGenerationRequests(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { page = 1, limit = 10 } = req.query;
    const result = await answerSheetQrServices.getAnswerSheetQrGenerationRequests(
      instituteId,
      universityId,
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
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { requestId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await answerSheetQrServices.getAnswerSheetQrsByRequestId(
      requestId,
      instituteId,
      universityId,
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
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { assignedToUserId, answerSheetQrIds } = req.body;

    const result = await answerSheetQrServices.assignAnswerSheetsToTeachers(
      assignedToUserId,
      answerSheetQrIds,
      instituteId,
      universityId,
    );

    return SuccessResponse(res, 200, "Answer sheets assigned to teachers successfully", result);
  } catch (error) {
    console.error("Error in assignAnswerSheetsToTeachers controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getScriptsAssignedToTeacher(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { assignedToUserId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await answerSheetQrServices.getScriptsAssignedToTeacher(
      assignedToUserId,
      instituteId,
      universityId,
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
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { id } = req.params;
    const { obtained_marks } = req.body;

    const result = await answerSheetQrServices.assignObtainedMarksToAnswerSheet(
      Number(id),
      Number(obtained_marks),
      instituteId,
      universityId,
    );

    return SuccessResponse(res, 200, "Obtained marks assigned successfully", result);
  } catch (error) {
    console.error("Error in assignObtainedMarksToAnswerSheet controller:", error);
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function splitAnswerSheetPdf(req, res) {
  try {
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;

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

    // ── Enqueue the job ───────────────────────────────────────────────────────
    const { jobId, jobDbId } = await answerSheetSplitterServices.enqueuePdfSplitJob(
      s3Key,
      instituteId,
      universityId,
      req.user.userId,
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
