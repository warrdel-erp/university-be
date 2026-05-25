import * as s3FileService from "../services/s3FileService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import fs from "fs";
import path from "path";


/**
 * Handles the generation of an S3 pre-signed upload URL.
 */
export async function requestUploadUrl(req, res) {
  try {
    const fileData = req.body;
    const result = await s3FileService.generateUploadUrl(req.user, fileData);

    return SuccessResponse(
      res,
      201,
      "S3 pre-signed upload URL generated successfully",
      result
    );
  } catch (error) {
    console.error("Error in requestUploadUrl controller:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to generate upload URL."
    );
  }
}

/**
 * Confirms a successful upload by verifying the file metadata against S3 storage.
 */
export async function confirmUpload(req, res) {
  try {
    const { fileUploadId } = req.body;
    const result = await s3FileService.confirmUpload(req.user, fileUploadId);

    return SuccessResponse(
      res,
      200,
      "File upload verified and marked active successfully",
      result
    );
  } catch (error) {
    console.error("Error in confirmUpload controller:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to confirm file upload."
    );
  }
}

/**
 * Retrieves all files stored in the DB.
 */
export async function getAllFilesFromDB(req, res) {
  try {
    const result = await s3FileService.getAllFilesFromDB();
    return SuccessResponse(res, 200, "Files retrieved successfully", result);
  } catch (error) {
    console.error("Error in getAllFilesFromDB controller:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to retrieve files from DB."
    );
  }
}

/**
 * Retrieves all files directly from the S3 bucket.
 */
export async function getAllFilesFromS3(req, res) {
  try {
    const result = await s3FileService.getAllFilesFromS3();
    return SuccessResponse(res, 200, "Files retrieved from S3 successfully", result);
  } catch (error) {
    console.error("Error in getAllFilesFromS3 controller:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to retrieve files from S3."
    );
  }
}

/**
 * Generates a pre-signed GET URL for viewing or downloading an S3 file.
 */
export async function getDownloadUrl(req, res) {
  try {
    const { id } = req.params;
    const result = await s3FileService.getDownloadUrl(req.user, id);

    return SuccessResponse(
      res,
      200,
      "S3 pre-signed download URL generated successfully",
      result
    );
  } catch (error) {
    console.error("Error in getDownloadUrl controller:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to generate download URL."
    );
  }
}
