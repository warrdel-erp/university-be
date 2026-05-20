import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { convert } from "pdf-poppler";
import { PDFDocument } from "pdf-lib";
import { createCanvas, loadImage } from "canvas";
import jsQR from "jsqr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Convert a single PDF page (0-indexed) to a PNG image using pdf-poppler.
 * Returns the absolute path of the generated PNG.
 *
 * NOTE: pdf-poppler requires the system utility `poppler` to be installed.
 *   macOS:  brew install poppler
 *   Ubuntu: sudo apt-get install poppler-utils
 *
 * @param {string} pdfPath    - Absolute path to the source PDF
 * @param {number} pageIndex  - 0-indexed page number
 * @param {string} tmpDir     - Directory to write the PNG into
 * @returns {Promise<string>} - Absolute path of the generated PNG
 */
export async function convertPageToImage(pdfPath, pageIndex, tmpDir) {
  const opts = {
    format: "png",
    out_dir: tmpDir,
    out_prefix: "page",
    page: pageIndex + 1, // pdf-poppler uses 1-indexed pages
    single_file: false,
    resolution: 150,     // 150 DPI is sufficient for QR scanning
  };

  await convert(pdfPath, opts);

  // pdf-poppler names output files: page-001.png, page-002.png, …
  const paddedNum = String(pageIndex + 1).padStart(3, "0");
  const imagePath = path.join(tmpDir, `page-${paddedNum}.png`);

  if (!fs.existsSync(imagePath)) {
    throw new Error(
      `Image was not generated for page ${pageIndex + 1}. ` +
        "Please ensure 'poppler' is installed on this system " +
        "(macOS: brew install poppler | Ubuntu: sudo apt-get install poppler-utils)."
    );
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
  const copiedPages = await newDoc.copyPagesFrom(srcDoc, pageIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));

  const pdfBytes = await newDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
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
