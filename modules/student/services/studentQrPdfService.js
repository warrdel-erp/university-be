import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import * as studentRepository from "../repository/studentRepository.js";

/**
 * Generate a high-resolution QR PNG buffer from a string payload.
 * @param {string} payload
 * @returns {Promise<Buffer>}
 */
async function createQrBuffer(payload) {
  return QRCode.toBuffer(String(payload), {
    margin: 1,
    width: 300,
    errorCorrectionLevel: "H",
  });
}

/**
 * Build a single page in the PDF for a student.
 */
async function appendStudentQrPage(pdfDoc, student, fonts) {
  const { fontBold, fontRegular } = fonts;
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
  const { width, height } = page.getSize();

  // 1. Outer decorative borders
  page.drawRectangle({
    x: 25,
    y: 25,
    width: width - 50,
    height: height - 50,
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1.5,
  });

  page.drawRectangle({
    x: 29,
    y: 29,
    width: width - 58,
    height: height - 58,
    borderColor: rgb(0.9, 0.92, 0.95),
    borderWidth: 0.5,
  });

  // 2. Header
  const title = "STUDENT IDENTITY PASS";
  const titleWidth = fontBold.widthOfTextAtSize(title, 20);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 80,
    size: 20,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.44), // Deep Navy
  });

  const subtitle = "ACADEMIC IDENTIFICATION & VERIFICATION";
  const subWidth = fontRegular.widthOfTextAtSize(subtitle, 10);
  page.drawText(subtitle, {
    x: (width - subWidth) / 2,
    y: height - 100,
    size: 10,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.58),
  });

  page.drawLine({
    start: { x: 50, y: height - 118 },
    end: { x: width - 50, y: height - 118 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // 3. QR Code generated from student.uuid
  const qrTarget = student.uuid || String(student.studentId);
  const qrBuffer = await createQrBuffer(qrTarget);
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  const qrSize = 230;
  const qrX = (width - qrSize) / 2;
  const qrY = height - 380;

  // QR Container card
  page.drawRectangle({
    x: qrX - 12,
    y: qrY - 12,
    width: qrSize + 24,
    height: qrSize + 24,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  // 4. Student Details Box
  const cardX = 50;
  const cardWidth = width - 100;
  const cardHeight = 220;
  const cardY = qrY - cardHeight - 35;

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: rgb(0.97, 0.98, 1), // Light cool background
    borderColor: rgb(0.85, 0.89, 0.94),
    borderWidth: 1,
  });

  // Student Full Name
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toUpperCase();

  page.drawText("STUDENT NAME", {
    x: cardX + 25,
    y: cardY + cardHeight - 32,
    size: 9,
    font: fontBold,
    color: rgb(0.45, 0.5, 0.58),
  });
  page.drawText(fullName || "N/A", {
    x: cardX + 25,
    y: cardY + cardHeight - 52,
    size: 15,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  page.drawLine({
    start: { x: cardX + 25, y: cardY + cardHeight - 65 },
    end: { x: cardX + cardWidth - 25, y: cardY + cardHeight - 65 },
    thickness: 0.8,
    color: rgb(0.88, 0.91, 0.95),
  });

  // Grid fields:
  const col1X = cardX + 25;
  const col2X = cardX + 250;

  const drawField = (label, value, x, y) => {
    page.drawText(label, {
      x,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.45, 0.5, 0.58),
    });
    page.drawText(String(value ?? "N/A"), {
      x,
      y: y - 16,
      size: 11,
      font: fontRegular,
      color: rgb(0.12, 0.16, 0.22),
    });
  };

  // Row 1: Scholar No & Batch
  drawField("SCHOLAR NUMBER", student.scholarNumber || "N/A", col1X, cardY + cardHeight - 95);
  drawField("BATCH", student.batch?.batch || "N/A", col2X, cardY + cardHeight - 95);

  // Row 2: Program (Course) & Term
  const termStr = student.studentClassSectionTerm?.term
    ? `Term ${student.studentClassSectionTerm.term}`
    : "N/A";
  drawField("PROGRAM", student.course?.courseName || "N/A", col1X, cardY + cardHeight - 140);
  drawField("TERM", termStr, col2X, cardY + cardHeight - 140);

  // Row 3: Active Section
  const sectionStr = student.studentClassSectionTerm?.classSection?.section
    ? `Section ${student.studentClassSectionTerm.classSection.section}`
    : "N/A";
  drawField("CURRENT SECTION", sectionStr, col1X, cardY + cardHeight - 185);

  // 5. Page footer
  const footerText = "Scan this QR code using an authorized scanner to verify student credentials.";
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 9);
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 50,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.62),
  });
}

/**
 * Generate PDF with 1 page per student QR code.
 * @param {object} filters
 * @returns {Promise<{ pdfBuffer: Buffer, count: number }>}
 */
export async function generateStudentsQrPdf(filters = {}) {
  const students = await studentRepository.getStudentsForQrPdf(filters);

  if (!students || students.length === 0) {
    const error = new Error("No students found matching the given criteria.");
    error.statusCode = 404;
    throw error;
  }

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fonts = { fontBold, fontRegular };

  for (const student of students) {
    await appendStudentQrPage(pdfDoc, student, fonts);
  }

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBuffer: Buffer.from(pdfBytes),
    count: students.length,
  };
}

/**
 * Generate single student QR code as Base64 Data URL for profile view.
 * @param {number|string} studentId
 * @returns {Promise<object>}
 */
export async function getStudentProfileQrCode(studentId) {
  const students = await studentRepository.getStudentsForQrPdf({ studentId });
  if (!students || students.length === 0) {
    const error = new Error("Student not found.");
    error.statusCode = 404;
    throw error;
  }

  const student = students[0];
  const qrTarget = student.uuid || String(student.studentId);

  const qrCodeBase64 = await QRCode.toDataURL(qrTarget, {
    width: 250,
    margin: 1,
    errorCorrectionLevel: "H",
  });

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    studentId: student.studentId,
    uuid: student.uuid,
    scholarNumber: student.scholarNumber,
    name: fullName,
    program: student.course?.courseName || null,
    batch: student.batch?.batch || null,
    term: student.studentClassSectionTerm?.term || null,
    section: student.studentClassSectionTerm?.classSection?.section || null,
    qrCode: qrCodeBase64,
  };
}

/**
 * Fetch full student details using their UUID (scanned from QR code).
 * @param {string} uuid
 * @returns {Promise<object>}
 */
export async function getStudentDetailsByUuid(uuid) {
  if (!uuid || typeof uuid !== "string" || uuid.trim() === "") {
    const error = new Error("Valid UUID is required.");
    error.statusCode = 400;
    throw error;
  }

  const student = await studentRepository.getStudentByUuid(uuid.trim());
  if (!student) {
    const error = new Error(`Student not found with UUID: ${uuid}`);
    error.statusCode = 404;
    throw error;
  }

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    ...student,
    fullName,
    programName: student.course?.courseName || null,
    batchName: student.batch?.batch || null,
    term: student.studentClassSectionTerm?.term || null,
    currentSection: student.studentClassSectionTerm?.classSection?.section || null,
    instituteName: student.institute?.instituteName || null,
    campusName: student.campus?.campusName || null,
  };
}

