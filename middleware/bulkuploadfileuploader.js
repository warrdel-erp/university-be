import path from "path";
import { ErrorResponse } from "../utility/response.js";

const ALLOWED_EXTENSIONS = /\.(xlsx|xls|xlsm)$/i;

/** Returns error message if file is missing or not Excel; otherwise null. */
export function validateBulkUploadExcelFile(file) {
  if (!file?.data) {
    return "Excel file is required (form field: book)";
  }

  const fileName = file.name || file.originalname || "";
  const extension = path.extname(fileName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.test(extension)) {
    return "Only Excel files are allowed (.xlsx, .xls, .xlsm). PDF and other formats are not supported.";
  }

  return null;
}

/**
 * POST /libraryCreation/bulkUpload — accept Excel only (field name: book).
 * Rejects PDF, CSV, and other file types before parsing.
 */
export function bulkUploadFileUploader(req, res, next) {
  const fileError = validateBulkUploadExcelFile(req.files?.book);
  if (fileError) {
    return ErrorResponse(res, 400, fileError);
  }

  next();
}
