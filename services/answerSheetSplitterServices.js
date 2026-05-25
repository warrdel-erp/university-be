import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import { convertPageToImage, scanQrFromImage, extractPageRangeToBuffer } from "../utility/pdfSplitter.js";
import AnswerSheetQrModel from "../models/answerSheetQrModel.js";
import { PDFDocument } from "pdf-lib";
import * as s3Helper from "../utility/s3Helper.js";
import * as s3FileRepository from "../repository/s3FileRepository.js";
import sequelize from "../database/sequelizeConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_PER_STUDENT = 2;

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getPdfPageCount(pdfBuffer) {
  const srcPdfBytes = new Uint8Array(pdfBuffer);
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw createServiceError("The uploaded PDF has no pages.", 400);
  }

  return { srcPdfBytes, totalPages };
}

async function scanQrCodesFromPdf(srcPdfBytes, totalPages) {
  const qrPageIndices = [];
  for (let i = 0; i < totalPages; i += PAGES_PER_STUDENT) {
    qrPageIndices.push(i);
  }

  const totalSegments = qrPageIndices.length;
  const scannedQrs = []; // [{ pageIndex, qrValue }]
  const scanErrors = []; // [{ page, reason }]

  for (const pageIndex of qrPageIndices) {
    const humanPage = pageIndex + 1; // 1-indexed for user messages
    let imageBuffer;

    try {
      imageBuffer = await convertPageToImage(srcPdfBytes, pageIndex);
    } catch (convErr) {
      scanErrors.push({
        page: humanPage,
        reason: `Could not render page ${humanPage} to an image buffer. ${convErr.message}`,
      });
      continue;
    }

    let qrValue = await scanQrFromImage(imageBuffer);

    if (!qrValue) {
      scanErrors.push({
        page: humanPage,
        reason:
          `No QR code was detected on page ${humanPage}. ` +
          `Please ensure a valid QR code is printed at the top-right quarter of every ${PAGES_PER_STUDENT}th page (pages 1, 31, 61, …).`,
      });
    } else {
      // If the scanned QR includes a path-like structure (e.g. "answersheet/UUID"), split and extract the UUID.
      if (qrValue.includes("/")) {
        qrValue = qrValue.split("/").pop();
      }
      scannedQrs.push({ pageIndex, qrValue });
    }
  }

  if (scanErrors.length > 0) {
    const details = scanErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
    const error = new Error(
      `QR scanning failed on ${scanErrors.length} of ${totalSegments} page(s). ` +
        `No files have been created. Please fix the issues and re-upload.\n\n${details}`,
    );
    error.statusCode = 422;
    error.scanErrors = scanErrors;
    throw error;
  }

  return scannedQrs;
}

async function validateScannedQrsAgainstDb(scannedQrs, instituteId, universityId) {
  const scannedValues = scannedQrs.map((s) => s.qrValue);

  const dbRows = await AnswerSheetQrModel.findAll({
    where: {
      qr: { [Op.in]: scannedValues },
      instituteId,
      universityId,
    },
    attributes: ["id", "qr", "studentId", "examScheduleId", "fileUploadId"],
  });

  const dbMap = new Map(dbRows.map((r) => [r.qr, r]));
  const validationErrors = [];

  for (const { pageIndex, qrValue } of scannedQrs) {
    const humanPage = pageIndex + 1;
    const row = dbMap.get(qrValue);

    if (!row) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The QR code on page ${humanPage} ("${qrValue}") was not found in this institute's system. ` +
          `It may belong to a different institute or may not have been generated through this system.`,
      });
      continue;
    }

    if (row.fileUploadId) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The answer sheet on page ${humanPage} (QR: ${qrValue}) has already been processed and uploaded. ` +
          `It cannot be processed again.`,
      });
      continue;
    }

    if (!row.studentId) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The answer sheet on page ${humanPage} (QR: ${qrValue}) has not been assigned to a student yet. ` +
          `Please map this QR to a student before splitting the PDF.`,
      });
      continue;
    }

    if (!row.examScheduleId) {
      validationErrors.push({
        page: humanPage,
        qr: qrValue,
        reason:
          `The answer sheet on page ${humanPage} (QR: ${qrValue}) has not been linked to an exam schedule yet. ` +
          `Please map this QR to an exam schedule before splitting the PDF.`,
      });
    }
  }

  if (validationErrors.length > 0) {
    const totalSegments = scannedQrs.length;
    const details = validationErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
    const error = new Error(
      `Validation failed for ${validationErrors.length} of ${totalSegments} answer sheet(s). ` +
        `No files have been created. Please resolve the issues and re-upload.\n\n${details}`,
    );
    error.statusCode = 422;
    error.validationErrors = validationErrors;
    throw error;
  }

  return dbMap;
}

async function splitAndSaveAnswerSheets(srcPdfBytes, scannedQrs, dbMap, instituteId, universityId, createdBy) {
  const transaction = await sequelize.transaction();
  const results = [];

  try {
    for (let seg = 0; seg < scannedQrs.length; seg++) {
      const { pageIndex, qrValue } = scannedQrs[seg];
      const startPage = pageIndex; // 0-indexed, inclusive
      const endPage = startPage + PAGES_PER_STUDENT - 1; // 0-indexed, inclusive

      const fileName = `${qrValue}.pdf`;

      // Extract split PDF page range directly to a Buffer
      const pdfBuffer = await extractPageRangeToBuffer(srcPdfBytes, startPage, endPage);

      const uniquePrefix = uuidv4();
      const s3Key = `answer-sheets/${uniquePrefix}-${fileName}`;
      const s3Url = await s3Helper.uploadFileToS3(pdfBuffer, s3Key, "application/pdf");

      const dbRow = dbMap.get(qrValue);

      // Create s3_files record
      const s3File = await s3FileRepository.createS3FileEntry(
        {
          entityType: "answer_sheet",
          entityId: dbRow.id ? String(dbRow.id) : null,
          companyId: Number(instituteId || universityId || 0) || null,
          size: pdfBuffer.length,
          mime: "application/pdf",
          status: "active",
          s3Key,
          originalName: fileName,
          createdBy,
        },
        transaction,
      );

      // Update the AnswerSheetQr record with fileUploadId: s3File.id
      const [updatedRows] = await AnswerSheetQrModel.update(
        { fileUploadId: s3File.id },
        {
          where: { id: dbRow.id },
          transaction,
        },
      );

      if (updatedRows === 0) {
        throw createServiceError(`Failed to update AnswerSheet QR record (QR: ${qrValue}). 0 rows updated.`);
      }

      results.push({
        qr: qrValue,
        filePath: path.join("uploads", "answer-sheets", fileName),
        s3Key,
        s3Url,
        studentId: dbRow.studentId,
        examScheduleId: dbRow.examScheduleId,
        fileUploadId: s3File.id,
      });
    }

    await transaction.commit();
    return { totalStudents: results.length, results };
  } catch (txError) {
    await transaction.rollback();
    throw txError;
  }
}

/**
 * Split a large answer-sheet PDF into per-student PDFs by reading the QR code
 * on every 30th page (pages 1, 31, 61, … — 1-indexed).
 *
 * Abort conditions (nothing is written to disk):
 *  - Any QR page has no scannable QR code
 *  - Any scanned QR UUID is not found in answer_sheet_qr for this institute/university
 *  - Any matched row has a null studentId or null examScheduleId
 *
 * On success: one PDF per student is saved to uploads/answer-sheets/<uuid>.pdf
 *
 * @param {Buffer} pdfBuffer - The uploaded PDF file buffer
 * @param {number} instituteId
 * @param {number} universityId
 * @returns {Promise<{ totalStudents: number, results: Array<{ qr, filePath, studentId, examScheduleId }> }>}
 */
export async function splitAnswerSheetPdf(pdfBuffer, instituteId, universityId, createdBy) {
  try {
    const { srcPdfBytes, totalPages } = await getPdfPageCount(pdfBuffer);
    const scannedQrs = await scanQrCodesFromPdf(srcPdfBytes, totalPages);
    const dbMap = await validateScannedQrsAgainstDb(scannedQrs, instituteId, universityId);
    return await splitAndSaveAnswerSheets(srcPdfBytes, scannedQrs, dbMap, instituteId, universityId, createdBy);
  } catch (err) {
    throw err;
  }
}
