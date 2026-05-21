import csv from "csv-parser";
import fs from "fs";
import xlsx from "xlsx";

/**
 * Read CSV file using stream parser.
 * Best for large CSV uploads.
 */
export const readCSV = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const results = [];

      const filePath = file?.tempFilePath || file?.student?.data;

      if (!filePath || !fs.existsSync(filePath)) {
        return reject(new Error("CSV file not found"));
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => {
          // Skip completely empty rows
          const hasValue = Object.values(data).some(
            (value) => String(value).trim() !== ""
          );

          if (hasValue) {
            results.push(data);
          }
        })
        .on("end", () => resolve(results))
        .on("error", (error) => {
          reject(new Error(`Error reading CSV file: ${error.message}`));
        });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Read Excel file and merge additional data into each row.
 */
export const readExcel = (file, extraData = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.read(file.student.data, {
        type: "buffer",
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
        blankrows: false,
      });

      const updatedData = data.map((item) => ({
        ...item,
        ...extraData,
      }));

      resolve(updatedData);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generic Excel reader utility.
 * Reads Excel file buffer and converts to JSON.
 */
export const readExcelFile = (fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("Excel file buffer is required");
  }

  const workbook = xlsx.read(fileBuffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("No sheet found in Excel file");
  }

  const sheet = workbook.Sheets[sheetName];

  return xlsx.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
    blankrows: false,
  });
};

/**
 * Optimized reader for library bulk uploads.
 * - Skips blank rows
 * - Trims values
 * - Prevents inflated row counts
 * - Better for large uploads
 */
export const readLibraryBulkUploadExcelFile = (fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("Excel file buffer is required");
  }

  const workbook = xlsx.read(fileBuffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("No sheet found in Excel file");
  }

  const sheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
    blankrows: false,
  });

  // Remove rows where all fields are empty
  return data.filter((row) =>
    Object.values(row).some(
      (value) => String(value).trim() !== ""
    )
  );
};