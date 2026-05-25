import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";
import { createCanvas, loadImage } from "canvas";
import jsQR from "jsqr";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Convert a single PDF page (0-indexed) to a PNG image using pdfjs-dist (pure JS-only).
 * Returns the absolute path of the generated PNG.
 *
 * @param {string} pdfPath    - Absolute path to the source PDF
 * @param {number} pageIndex  - 0-indexed page number
 * @param {string} tmpDir     - Directory to write the PNG into
 * @returns {Promise<string>} - Absolute path of the generated PNG
 */
export async function convertPageToImage(pdfPath, pageIndex, tmpDir) {
  const paddedNum = String(pageIndex + 1).padStart(3, "0");
  const imagePath = path.join(tmpDir, `page-${paddedNum}.png`);

  try {
    // 1. Read PDF file into buffer
    const data = new Uint8Array(fs.readFileSync(pdfPath));

    // 2. Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;

    // 3. Get the page (1-indexed in PDF.js)
    const page = await pdfDoc.getPage(pageIndex + 1);

    // 4. Get viewport at scale (1.5 scale is sufficient and corresponds to ~150 DPI)
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // 5. Create Canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    // 6. Render page context
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // 7. Write the canvas to PNG file
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(imagePath, buffer);
  } catch (error) {
    throw new Error(
      `Failed to convert PDF page ${pageIndex + 1} to image using pure JS: ${error.message}`
    );
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image was not generated for page ${pageIndex + 1}.`);
  }

  return imagePath;
}


/**
 * Decode the QR code embedded in a PNG image.
 * Uses canvas to read pixel data and jsQR to decode.
 *
 * @param {string} imagePath - Absolute path to the PNG image
 * @returns {Promise<string|null>} - Decoded QR string, or null if no QR found
 */
export async function scanQrFromImage(imagePath) {
  const img = await loadImage(imagePath);
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

/**
 * Recursively remove a temporary directory (best-effort, never throws).
 *
 * @param {string} dirPath
 */
export function cleanupTmpDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (_) {
    // intentional no-op — cleanup failures must not mask the real response
  }
}
