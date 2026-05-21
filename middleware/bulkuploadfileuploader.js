import path from "path";
import multer from "multer";
import { ErrorResponse } from "../utility/response.js";

const storage = multer.memoryStorage();

const allowedMimetypes = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
];

const filetypes = /csv|xlsx|xlsm|xls/;

/** Accept CSV / Excel by mimetype or file extension. */
const excelFileFilter = (_req, file, cb) => {
  const mimetype = allowedMimetypes.includes(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype || extname) {
    return cb(null, true);
  }

  cb(new Error("Only .csv, .xlsx, .xlsm, and .xls files are allowed!"));
};

export const uploadCSV = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** POST /libraryCreation/bulkUpload — form field: book */
export const libraryBulkUploadMulter = uploadCSV.single("book");

/** Run after multer; maps errors to API response. */
export function handleLibraryBulkUploadMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return ErrorResponse(res, 400, "File too large (max 5 MB)");
    }
    return ErrorResponse(res, 400, err.message);
  }

  if (err) {
    return ErrorResponse(res, 400, err.message);
  }

  if (!req.file?.buffer?.length) {
    return ErrorResponse(res, 400, "File is required (form-data field: book)");
  }

  next();
}
