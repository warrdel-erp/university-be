/**
 * cliToolWrapper.js
 *
 * Centralised wrappers for every system CLI tool used in PDF processing.
 * ALL direct execFile / spawn calls for external binaries live here.
 *
 * Supported tools:
 *   • qpdf      — PDF page-range extraction   (brew install qpdf / apt-get install qpdf)
 *   • pdftoppm  — PDF page → JPEG rasteriser  (brew install poppler / apt install poppler-utils)
 *   • pdfinfo   — PDF metadata reader          (same package as pdftoppm)
 *
 * Why a wrapper?
 *   - One place to change binary paths, flags, or timeouts across the whole codebase.
 *   - Consistent, actionable error messages with install hints.
 *   - Callers never import child_process directly — easier to mock in tests.
 *   - Swap any tool (e.g. replace pdftoppm with mutool) in a single file.
 */

import { execFile, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

// ─── Timeout defaults (ms) ────────────────────────────────────────────────────
// Override via environment variables for CI / low-resource environments.

const TIMEOUT_PDFINFO  = Number(process.env.CLI_TIMEOUT_PDFINFO)  || 30_000;   //  30 s
const TIMEOUT_PDFTOPPM = Number(process.env.CLI_TIMEOUT_PDFTOPPM) || 60_000;   //  60 s per page
const TIMEOUT_QPDF     = Number(process.env.CLI_TIMEOUT_QPDF)     || 120_000;  // 120 s per segment

// ─── Install hints ────────────────────────────────────────────────────────────

const INSTALL_HINTS = {
  qpdf:     "brew install qpdf  (macOS)  |  apt-get install qpdf  (Debian/Ubuntu)",
  pdftoppm: "brew install poppler  (macOS)  |  apt install poppler-utils  (Debian/Ubuntu)",
  pdfinfo:  "brew install poppler  (macOS)  |  apt install poppler-utils  (Debian/Ubuntu)",
};

// ─── qpdf ─────────────────────────────────────────────────────────────────────

/**
 * Extract a 1-indexed page range [startPage, endPage] (inclusive) from a
 * source PDF file into a new PDF file using the `qpdf` CLI.
 *
 * qpdf reads only the required page-object tree — it does NOT load the full
 * file into memory, making it ideal for multi-GB answer-sheet PDFs.
 *
 * Exit code 3 means "warnings present but output is valid" and is treated as
 * success per the qpdf specification.
 *
 * @param {string} srcPath    - Absolute path to source PDF
 * @param {number} startPage  - 1-indexed first page (inclusive)
 * @param {number} endPage    - 1-indexed last page (inclusive)
 * @param {string} outputPath - Absolute path for the resulting PDF
 * @returns {Promise<string>} outputPath on success
 * @throws {Error} with a descriptive message including the install hint
 */
export function qpdfExtractPages(srcPath, startPage, endPage, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      srcPath,
      "--pages", srcPath, `${startPage}-${endPage}`,
      "--",
      outputPath,
    ];

    const proc = spawn("qpdf", args, { timeout: TIMEOUT_QPDF });
    let stderrOutput = "";

    proc.stderr.on("data", (chunk) => {
      stderrOutput += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(
        new Error(
          `qpdf: failed to start — ${err.message}.\n` +
          `Install: ${INSTALL_HINTS.qpdf}`
        )
      );
    });

    proc.on("close", (code) => {
      if (code === 0 || code === 3) {
        // code 3 = warnings only; output file is valid per qpdf spec
        resolve(outputPath);
      } else {
        reject(
          new Error(
            `qpdf exited with code ${code} while extracting pages ${startPage}–${endPage}.\n` +
            `stderr: ${stderrOutput.trim() || "(none)"}\n` +
            `Install: ${INSTALL_HINTS.qpdf}`
          )
        );
      }
    });
  });
}

// ─── pdftoppm ─────────────────────────────────────────────────────────────────

/**
 * Rasterise a single PDF page (0-indexed) to a JPEG buffer using `pdftoppm`
 * (Poppler). The temp JPEG is written to outPrefix, read into memory, then
 * deleted — callers never manage temp files themselves.
 *
 * pdftoppm names its output files like: {outPrefix}-000001.jpg
 *
 * @param {string} pdfFilePath - Absolute path to the source PDF on disk
 * @param {number} pageIndex   - 0-indexed page number
 * @param {string} outPrefix   - Absolute path prefix for the temp output file
 *                               (e.g. /tmp/qr-scan-<jobId>-pg<n>)
 * @returns {Promise<Buffer>}  - JPEG image buffer
 * @throws {Error} with a descriptive message including the install hint
 */
export async function pdftoppmPageToJpeg(pdfFilePath, pageIndex, outPrefix) {
  const humanPage = pageIndex + 1; // pdftoppm is 1-indexed

  try {
    await execFileAsync(
      "pdftoppm",
      [
        "-jpeg",
        "-r", "200",             // 200 DPI — reliable for QR code detection
        "-f", String(humanPage),
        "-l", String(humanPage),
        pdfFilePath,
        outPrefix,
      ],
      { timeout: TIMEOUT_PDFTOPPM }
    );
  } catch (err) {
    throw new Error(
      `pdftoppm: failed to rasterise page ${humanPage} — ${err.message}.\n` +
      `Install: ${INSTALL_HINTS.pdftoppm}`
    );
  }

  // Locate the output file (pdftoppm appends a zero-padded page number)
  const outDir  = path.dirname(outPrefix);
  const outBase = path.basename(outPrefix);
  const matches = fs.readdirSync(outDir).filter(
    (f) => f.startsWith(outBase) && (f.endsWith(".jpg") || f.endsWith(".jpeg"))
  );

  if (matches.length === 0) {
    throw new Error(
      `pdftoppm: produced no output file for page ${humanPage}. ` +
      `Prefix searched: "${outPrefix}".\n` +
      `Install: ${INSTALL_HINTS.pdftoppm}`
    );
  }

  const jpegPath = path.join(outDir, matches[0]);
  const buffer   = fs.readFileSync(jpegPath);

  // Clean up immediately to keep the temp directory lean
  try { fs.unlinkSync(jpegPath); } catch (_) { /* non-fatal */ }

  return buffer;
}

// ─── pdfinfo ──────────────────────────────────────────────────────────────────

/**
 * Return the total page count of a PDF file using `pdfinfo` (Poppler).
 *
 * pdfinfo reads only the PDF's cross-reference table and metadata — it is
 * extremely fast even on large files without loading individual pages.
 *
 * @param {string} pdfFilePath - Absolute path to the PDF on disk
 * @returns {Promise<number>}  - Total page count (>= 1)
 * @throws {Error} if pdfinfo fails, the file is not a valid PDF, or has 0 pages
 */
export async function pdfinfoGetPageCount(pdfFilePath) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      "pdfinfo",
      [pdfFilePath],
      { timeout: TIMEOUT_PDFINFO }
    ));
  } catch (err) {
    throw new Error(
      `pdfinfo: failed to read metadata — ${err.message}.\n` +
      `Ensure the file is a valid PDF.\n` +
      `Install: ${INSTALL_HINTS.pdfinfo}`
    );
  }

  const match = stdout.match(/^Pages:\s*(\d+)/m);
  if (!match) {
    throw new Error(
      "pdfinfo: could not parse page count from output. " +
      "The file may be corrupt or encrypted."
    );
  }

  const totalPages = parseInt(match[1], 10);
  if (!totalPages || totalPages === 0) {
    const err = new Error("pdfinfo: the PDF has 0 pages — nothing to process.");
    err.statusCode = 400;
    throw err;
  }

  return totalPages;
}
