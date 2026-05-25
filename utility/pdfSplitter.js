import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";
import { createCanvas, loadImage } from "canvas";
import jsQR from "jsqr";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Convert a single PDF page (0-indexed) to a PNG image buffer using pdfjs-dist.
 *
 * @param {Uint8Array|Buffer} pdfData - The source PDF as a Buffer or Uint8Array
 * @param {number} pageIndex  - 0-indexed page number
 * @returns {Promise<Buffer>} - PNG image buffer
 */
export async function convertPageToImage(pdfData, pageIndex) {
  try {
    // 1. Convert Buffer to Uint8Array if needed
    const data = new Uint8Array(pdfData);

    // 2. Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;

    // 3. Get the page (1-indexed in PDF.js)
    const page = await pdfDoc.getPage(pageIndex + 1);

    // 4. Get viewport at scale (1.5 scale is sufficient and corresponds to ~150 DPI)
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // We only want the top-right quarter of the page for QR scanning
    const cropWidth = viewport.width / 2;
    const cropHeight = viewport.height / 2;

    // 5. Create Canvas (half width, half height)
    const canvas = createCanvas(cropWidth, cropHeight);
    const context = canvas.getContext("2d");

    // 6. Render page context, translating left by cropWidth to capture the top-right
    await page.render({
      canvasContext: context,
      viewport: viewport,
      transform: [1, 0, 0, 1, -cropWidth, 0],
    }).promise;

    // 7. Return the canvas buffer
    return canvas.toBuffer("image/png");
  } catch (error) {
    throw new Error(
      `Failed to convert PDF page ${pageIndex + 1} to image buffer: ${error.message}`
    );
  }
}

/**
 * Decode the QR code embedded in a PNG image buffer.
 * Uses canvas to read pixel data and jsQR to decode.
 *
 * @param {Buffer} imageBuffer - Buffer of the PNG image
 * @returns {Promise<string|null>} - Decoded QR string, or null if no QR found
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

/**
 * Copy a page range [startPage, endPage] (both 0-indexed, inclusive)
 * from the source PDF bytes into a new PDF and write it to outputPath.
 *
 * @param {Uint8Array} srcPdfBytes - Raw bytes of the source PDF
 * @param {number}     startPage   - 0-indexed first page (inclusive)
 * @param {number}     endPage     - 0-indexed last page (inclusive)
 * @param {string}     outputPath  - Absolute path for the output PDF file
 */
export async function extractPageRange(srcPdfBytes, startPage, endPage, outputPath) {
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalPages = srcDoc.getPageCount();

  const safeEnd = Math.min(endPage, totalPages - 1);
  const pageIndices = [];
  for (let i = startPage; i <= safeEnd; i++) {
    pageIndices.push(i);
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));

  const pdfBytes = await newDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

/**
 * Extract a page range [startPage, endPage] (both 0-indexed, inclusive)
 * from the source PDF bytes and return the resulting PDF document as a Buffer.
 *
 * @param {Uint8Array} srcPdfBytes - Raw bytes of the source PDF
 * @param {number}     startPage   - 0-indexed first page (inclusive)
 * @param {number}     endPage     - 0-indexed last page (inclusive)
 * @returns {Promise<Buffer>}      - Buffer containing the split PDF file
 */
export async function extractPageRangeToBuffer(srcPdfBytes, startPage, endPage) {
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalPages = srcDoc.getPageCount();

  const safeEnd = Math.min(endPage, totalPages - 1);
  const pageIndices = [];
  for (let i = startPage; i <= safeEnd; i++) {
    pageIndices.push(i);
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));

  const pdfBytes = await newDoc.save();
  return Buffer.from(pdfBytes);
}

