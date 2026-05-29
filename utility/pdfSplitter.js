import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";
import { createCanvas, loadImage } from "canvas";
import jsQR from "jsqr";
import { pdftoppmPageToJpeg, qpdfExtractPages } from "./cliToolWrapper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── System pdftoppm: page → image ───────────────────────────────────────────

/**
 * Convert a single PDF page (0-indexed) to a JPEG image buffer using the
 * system-installed pdftoppm (Poppler). Delegates to cliToolWrapper.pdftoppmPageToJpeg.
 *
 * @param {string}  pdfFilePath  - Absolute path to the source PDF on disk
 * @param {number}  pageIndex    - 0-indexed page number
 * @param {string}  jobId        - Unique job id used to namespace temp files
 * @returns {Promise<Buffer>}    - JPEG image buffer
 */
export async function convertPageToImageFromFile(pdfFilePath, pageIndex, jobId) {
  const outPrefix = path.join(os.tmpdir(), `qr-scan-${jobId}-pg${pageIndex}`);
  return pdftoppmPageToJpeg(pdfFilePath, pageIndex, outPrefix);
}


// ─── jsQR: scan QR from image buffer ─────────────────────────────────────────

/**
 * Decode the QR code embedded in a JPEG/PNG image buffer.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<string|null>} Decoded QR string, or null if no QR found
 */
export async function scanQrFromImage(imageBuffer) {
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const code = jsQR(imageData.data, img.width, img.height, {
    inversionAttempts: "dontInvert",
  });

  return code ? code.data : null;
}

// ─── qpdf: extract page range to a new PDF file ──────────────────────────────

/**
 * Extract a page range [startPage, endPage] (1-indexed, inclusive) from a
 * source PDF file into a new PDF file using the qpdf CLI.
 * Delegates to cliToolWrapper.qpdfExtractPages.
 *
 * @param {string} srcPath    - Absolute path to source PDF
 * @param {number} startPage  - 1-indexed first page (inclusive)
 * @param {number} endPage    - 1-indexed last page (inclusive)
 * @param {string} outputPath - Absolute path for the resulting PDF
 * @returns {Promise<string>} outputPath on success
 */
export async function extractPageRangeViaQpdf(srcPath, startPage, endPage, outputPath) {
  return qpdfExtractPages(srcPath, startPage, endPage, outputPath);
}

// ─── Legacy helpers (kept for backward compatibility / direct usage) ──────────

/**
 * @deprecated Use convertPageToImageFromFile + extractPageRangeViaQpdf in the worker.
 * Convert a single PDF page (0-indexed) to a PNG image buffer using pdfjs-dist.
 */
export async function convertPageToImage(pdfData, pageIndex) {
  // Dynamically import pdfjs-dist only when this legacy path is used
  const { default: pdfjsLib } = await import("pdfjs-dist/legacy/build/pdf.js");
  try {
    const data = new Uint8Array(pdfData);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageIndex + 1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const cropWidth = viewport.width / 2;
    const cropHeight = viewport.height / 2;
    const canvas = createCanvas(cropWidth, cropHeight);
    const context = canvas.getContext("2d");
    await page.render({
      canvasContext: context,
      viewport: viewport,
      transform: [1, 0, 0, 1, -cropWidth, 0],
    }).promise;
    return canvas.toBuffer("image/png");
  } catch (error) {
    throw new Error(
      `Failed to convert PDF page ${pageIndex + 1} to image buffer: ${error.message}`
    );
  }
}

/**
 * Copy a page range [startPage, endPage] (both 0-indexed, inclusive)
 * from the source PDF bytes into a new PDF and write it to outputPath.
 */
export async function extractPageRange(srcPdfBytes, startPage, endPage, outputPath) {
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalPages = srcDoc.getPageCount();
  const safeEnd = Math.min(endPage, totalPages - 1);
  const pageIndices = [];
  for (let i = startPage; i <= safeEnd; i++) pageIndices.push(i);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));
  const pdfBytes = await newDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

/**
 * Extract a page range [startPage, endPage] (both 0-indexed, inclusive)
 * from the source PDF bytes and return the resulting PDF as a Buffer.
 */
export async function extractPageRangeToBuffer(srcPdfBytes, startPage, endPage) {
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalPages = srcDoc.getPageCount();
  const safeEnd = Math.min(endPage, totalPages - 1);
  const pageIndices = [];
  for (let i = startPage; i <= safeEnd; i++) pageIndices.push(i);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));
  const pdfBytes = await newDoc.save();
  return Buffer.from(pdfBytes);
}
