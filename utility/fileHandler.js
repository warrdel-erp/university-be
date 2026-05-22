import csv from "csv-parser";
import path from "path";
import { Readable } from "stream";
import xlsx from "xlsx";

const isNonEmptyRow = (row) =>
  Object.values(row).some((value) => String(value).trim() !== "");

export const readExcelFile = (fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("Excel file buffer is required");
  }

  const workbook = xlsx.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheet found in Excel file");
  }

  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
    blankrows: false,
  });
};

const readCsvFromBuffer = (fileBuffer) =>
  new Promise((resolve, reject) => {
    if (!fileBuffer?.length) {
      return reject(new Error("CSV file buffer is required"));
    }

    const results = [];
    Readable.from(fileBuffer)
      .pipe(csv())
      .on("data", (row) => {
        if (isNonEmptyRow(row)) results.push(row);
      })
      .on("end", () => resolve(results))
      .on("error", (error) => reject(new Error(`Error reading CSV file: ${error.message}`)));
  });

const getUploadBuffer = (file) => {
  if (file?.buffer?.length) return file.buffer;
  if (file?.data?.length) return file.data;
  return null;
};

const getUploadFileName = (file) => file?.originalname || file?.name || "";

/** Supports multer (`buffer`) and express-fileupload (`data`). */
export const readLibraryBulkUploadFile = async (file) => {
  const buffer = getUploadBuffer(file);
  if (!buffer?.length) {
    throw new Error("Upload file buffer is required");
  }

  const extension = path.extname(getUploadFileName(file)).toLowerCase();

  if (extension === ".csv") {
    return readCsvFromBuffer(buffer);
  }

  if (/\.(xlsx|xls|xlsm)$/i.test(extension)) {
    return readExcelFile(buffer).filter(isNonEmptyRow);
  }

  throw new Error("Unsupported file type. Use .xlsx, .xls, .xlsm, or .csv");
};
