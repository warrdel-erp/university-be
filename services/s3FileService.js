import { v4 as uuidv4 } from "uuid";
import path from "path";
import * as s3FileRepository from "../repository/s3FileRepository.js";
import * as s3Helper from "../utility/s3Helper.js";
import * as model from "../models/index.js";

// Extensible validation configurations for file size and MIME type by entityType
export const UPLOAD_CONFIGS = {
  student_photo: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimes: ["image/jpeg", "image/png", "image/jpg"],
  },
  employee_document: {
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    allowedMimes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  },
  FULL_EXAM_ANSWER_SHEET_PDF: {
    maxSizeBytes: 10 * 1024 * 1024 * 1024, // 10GB
    allowedMimes: ["application/pdf"],
  },
  general: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedMimes: [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
  },
};

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/csv": ".csv",
};

/**
 * Validates request payload and generates a PUT signed URL for upload.
 */
export async function generateUploadUrl(user, fileData) {
  const { entityType, entityId, fileName, fileSize, mimeType, companyId } = fileData;

  // Check if ExamSchedule already has an answer sheet PDF attached
  if (entityType === "FULL_EXAM_ANSWER_SHEET_PDF" && entityId) {
    const examScheduleId = Number(entityId);
    const examSchedule = await model.examScheduleModel.findByPk(examScheduleId);
    if (!examSchedule) {
      const err = new Error(`Exam schedule with ID ${examScheduleId} not found.`);
      err.statusCode = 404;
      throw err;
    }
    if (examSchedule.answerSheetS3FileId) {
      const err = new Error(
        `Exam schedule ID ${examScheduleId} already has an answer sheet PDF attached (S3 File ID: ${examSchedule.answerSheetS3FileId}). Please remove the existing file before uploading a new one.`
      );
      err.statusCode = 409;
      throw err;
    }
  }

  // 1. Resolve validation rules for entityType
  const config = UPLOAD_CONFIGS[entityType] || UPLOAD_CONFIGS.general;

  // 2. Validate file size
  if (fileSize > config.maxSizeBytes) {
    const err = new Error(
      `File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size for ${entityType} (${(config.maxSizeBytes / (1024 * 1024)).toFixed(0)} MB)`,
    );
    err.statusCode = 400;
    throw err;
  }

  // 3. Validate MIME type
  if (!config.allowedMimes.includes(mimeType)) {
    const err = new Error(`MIME type '${mimeType}' is not allowed for ${entityType}.`);
    err.statusCode = 400;
    throw err;
  }

  // 4. Access Control check
  // Verify user has access to the target company context
  const targetCompanyId = Number(companyId || user.defaultInstituteId || user.universityId);
  const userRole = user.role || "";
  const isAuthorized =
    (userRole === "Admin" && !user.defaultInstituteId && !user.universityId) ||
    Number(user.defaultInstituteId) === targetCompanyId ||
    Number(user.universityId) === targetCompanyId;

  if (!isAuthorized) {
    const err = new Error("Access Denied: You do not have permissions for the specified company/institute context.");
    err.statusCode = 403;
    throw err;
  }

  // 5. Generate a unique flat S3 key using UUID
  const rawExt = path.extname(fileName || "");
  const ext = rawExt || MIME_TO_EXT[mimeType] || ".bin";
  const uniqueId = uuidv4();
  const s3Key = `${uniqueId}${ext}`; // Flat UUID-based key

  // 6. Request pre-signed URL from S3 helper
  const uploadUrl = await s3Helper.getUploadSignedUrl(s3Key, mimeType);

  // 7. Save record in database with state "pending"
  const fileRecord = await s3FileRepository.createS3FileEntry({
    entityType,
    entityId: entityId ? String(entityId) : null,
    companyId: targetCompanyId,
    size: fileSize,
    mime: mimeType,
    status: "pending",
    s3Key,
    originalName: fileName || null,
    createdBy: user.userId,
  });

  return {
    fileUploadId: fileRecord.id,
    s3Key: fileRecord.s3Key,
    uploadUrl,
    metadata: {
      entityType: fileRecord.entityType,
      entityId: fileRecord.entityId,
      companyId: fileRecord.companyId,
      status: fileRecord.status,
    },
  };
}

/**
 * Confirms upload by verifying existence and metadata in S3 and changing status to active.
 */
export async function confirmUpload(user, fileUploadId) {
  // 1. Fetch file record from database
  const fileRecord = await s3FileRepository.getS3FileById(fileUploadId);
  if (!fileRecord) {
    const err = new Error("File upload record not found.");
    err.statusCode = 404;
    throw err;
  }

  if (fileRecord.status === "active") {
    return fileRecord; // Already confirmed
  }

  // 2. Access Control check: Ensure user is authorized to modify files for this tenant
  const targetCompanyId = Number(fileRecord.companyId);
  const userRole = user.role || "";
  const isAuthorized =
    (userRole === "Admin" && !user.defaultInstituteId && !user.universityId) ||
    // TODO - why you are comparing institute id with company ID
    Number(user.defaultInstituteId) === targetCompanyId ||
    Number(user.universityId) === targetCompanyId ||
    fileRecord.createdBy === user.userId;

  if (!isAuthorized) {
    const err = new Error("Access Denied: You are not authorized to confirm this upload.");
    err.statusCode = 403;
    throw err;
  }

  // 3. Verify object in S3 using HeadObject
  const s3Metadata = await s3Helper.verifyFileInS3(fileRecord.s3Key);

  // 4. Validate that S3 size does not exceed max allowed configuration for this entityType
  const config = UPLOAD_CONFIGS[fileRecord.entityType] || UPLOAD_CONFIGS.general;
  if (s3Metadata.size > config.maxSizeBytes) {
    const err = new Error(
      `Actual file size in storage (${(s3Metadata.size / (1024 * 1024)).toFixed(2)} MB) exceeds allowed limit.`,
    );
    err.statusCode = 400;
    throw err;
  }

  // If this is a main answer sheet PDF, check if the ExamSchedule already has an answer sheet
  let examSchedule = null;
  if (fileRecord.entityType === "FULL_EXAM_ANSWER_SHEET_PDF" && fileRecord.entityId) {
    const examScheduleId = Number(fileRecord.entityId);
    examSchedule = await model.examScheduleModel.findByPk(examScheduleId);
    if (!examSchedule) {
      const err = new Error(`Exam schedule with ID ${examScheduleId} not found.`);
      err.statusCode = 404;
      throw err;
    }
    if (examSchedule.answerSheetS3FileId) {
      const err = new Error(
        `Exam schedule ID ${examScheduleId} already has an answer sheet PDF attached (S3 File ID: ${examSchedule.answerSheetS3FileId}). Please remove the existing file before uploading a new one.`
      );
      err.statusCode = 409;
      throw err;
    }
  }

  // 5. Update database record with final size, type and mark status as active
  await s3FileRepository.updateS3File(fileUploadId, {
    status: "active",
    size: s3Metadata.size, // override size with actual verified storage size
    mime: s3Metadata.mime || fileRecord.mime, // use verified mime if returned, or keep original
  });

  // Attach to ExamSchedule if applicable
  if (examSchedule) {
    await examSchedule.update({ answerSheetS3FileId: fileUploadId });
    console.log(
      `[confirmUpload] Successfully attached S3 File ID ${fileUploadId} to Exam Schedule ID ${examSchedule.examScheduleId}`,
    );
  }

  // Fetch and return the updated record
  const updatedRecord = await s3FileRepository.getS3FileById(fileUploadId);
  return updatedRecord;
}

/**
 * Retrieves all files stored in the DB.
 */
export async function getAllFilesFromDB() {
  return await s3FileRepository.getAllS3Files();
}

/**
 * Retrieves all files directly from the S3 bucket.
 */
export async function getAllFilesFromS3() {
  return await s3Helper.listFilesInS3();
}

/**
 * Generates a pre-signed URL for downloading/viewing a file from S3.
 */
export async function getDownloadUrl(user, fileUploadId) {
  const fileRecord = await s3FileRepository.getS3FileById(fileUploadId);
  if (!fileRecord) {
    const err = new Error("File upload record not found.");
    err.statusCode = 404;
    throw err;
  }

  // Access Control check
  const targetCompanyId = Number(fileRecord.companyId);
  const userRole = user.role || "";
  const isAuthorized =
    (userRole === "Admin" && !user.defaultInstituteId && !user.universityId) ||
    Number(user.defaultInstituteId) === targetCompanyId ||
    Number(user.universityId) === targetCompanyId ||
    fileRecord.createdBy === user.userId;

  if (!isAuthorized) {
    const err = new Error("Access Denied: You are not authorized to view this file.");
    err.statusCode = 403;
    throw err;
  }

  const downloadUrl = await s3Helper.getDownloadSignedUrl(fileRecord.s3Key);
  return {
    fileUploadId: fileRecord.id,
    downloadUrl,
    mime: fileRecord.mime,
    originalName: fileRecord.originalName,
  };
}
