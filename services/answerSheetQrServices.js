import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { UniqueConstraintError, Op } from "sequelize";
import * as answerSheetQrRepository from "../repository/answerSheetQrRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { convertPageToImage, scanQrFromImage, extractPageRange, cleanupTmpDir } from "../utility/pdfSplitter.js";
import AnswerSheetQrModel from "../models/answerSheetQrModel.js";
import { PDFDocument } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_UNUSED_QR_PER_INSTITUTE = 5000;

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getStudentDisplayName(student) {
  if (!student) return null;
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ").trim() || null;
}

function buildExamContext(item, options = {}) {
  const { includeStudentIdentity = true } = options;
  const examSchedule = item?.examSchedule;
  const examSetupType = examSchedule?.examSetupTypeTerm?.examSetupType;
  const subject = examSchedule?.subjectSchedule;
  const student = item?.student;

  return {
    ...(includeStudentIdentity
      ? {
        studentDisplayName: getStudentDisplayName(student),
        enrollNumber: student?.enrollNumber || null,
        scholarNumber: student?.scholarNumber || null,
      }
      : {}),
    subjectName: subject?.subjectName || null,
    subjectCode: subject?.subjectCode || null,
    examType: examSetupType?.examType || null,
    examName: examSetupType?.examName || null,
    examDate: examSchedule?.examDate || null,
    examTime: examSchedule?.examTime || null,
    semesterId: examSchedule?.semesterId || null,
    sessionId: examSchedule?.sessionId || null,
    term: examSchedule?.examSetupTypeTerm?.term || null,
  };
}

export async function generateBulkAnswerSheetQr(count, instituteId, universityId) {
  const result = await sequelize.transaction(async (transaction) => {
    if (!Number.isInteger(count) || count <= 0) {
      throw createServiceError("Please provide a valid positive integer for count.", 400);
    }

    const unusedCount = await answerSheetQrRepository.countUnusedByInstitute(
      instituteId,
      universityId,
      transaction
    );

    if (unusedCount + count > MAX_UNUSED_QR_PER_INSTITUTE) {
      throw createServiceError(
        `Cannot generate QR codes. This institute already has ${unusedCount} unused codes. Maximum allowed unused codes is ${MAX_UNUSED_QR_PER_INSTITUTE}.`,
        409
      );
    }

    const requestId = uuidv4();
    const payload = Array.from({ length: count }, () => ({
      qr: uuidv4(),
      requestId,
      instituteId,
      universityId,
    }));

    const created = await answerSheetQrRepository.bulkCreateAnswerSheetQr(payload, transaction);

    return {
      requestId,
      createdCount: created.length,
      unusedCountAfterCreation: unusedCount + created.length,
      items: created,
    };
  });
  return result;
}

export async function mapAnswerSheetQr(qr, studentId, examScheduleId, instituteId, universityId) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const [student, examSchedule] = await Promise.all([
        answerSheetQrRepository.getScopedStudent(
          studentId,
          instituteId,
          universityId,
          transaction
        ),
        answerSheetQrRepository.getScopedExamSchedule(
          examScheduleId,
          instituteId,
          universityId,
          transaction
        ),
      ]);

      if (!student) throw createServiceError("Student not found in your institute.", 404);
      if (!examSchedule) throw createServiceError("Exam schedule not found in your institute.", 404);

      const hasHallTicket = await answerSheetQrRepository.hasStudentHallTicketForExamTerm(
        studentId,
        examSchedule.examSetupTypeTermId,
        examSchedule.sessionId,
        instituteId,
        universityId,
        transaction
      );
      if (!hasHallTicket) {
        throw createServiceError(
          "Student does not have a hall ticket for this exam setup type term.",
          400
        );
      }

      const result = await answerSheetQrRepository.mapAnswerSheetQrOnce(
        qr,
        studentId,
        examScheduleId,
        instituteId,
        universityId,
        transaction
      );

      if (!result) throw createServiceError("QR code not found.", 404);
      if (result.answerSheetAlreadyMapped) {
        throw createServiceError("This answer sheet is already mapped", 409);
      }
      if (result.studentExamAlreadyMapped) {
        throw createServiceError("This student is already assigned to this exam schedule", 409);
      }

      const { row } = result;
      return {
        id: row.id,
        qr: row.qr,
        requestId: row.requestId ?? null,
        studentId: row.studentId,
        examScheduleId: row.examScheduleId,
        assignedToUser: row.assignedToUser ?? null,
        evaluatedAt: row.evaluatedAt ?? null,
        obtainedMarks: row.obtainedMarks ?? null,
        instituteId: row.instituteId,
        universityId: row.universityId,
      };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw createServiceError("This student is already assigned to this exam schedule", 409);
    }
    throw error;
  }
}

export async function getAnswerSheetQrDetailById(id, instituteId, universityId) {
  const result = await sequelize.transaction(async (transaction) => {
    const row = await answerSheetQrRepository.getAnswerSheetQrById(
      id,
      instituteId,
      universityId,
      transaction
    );

    if (!row) {
      throw createServiceError("Answer sheet QR not found.", 404);
    }

    const isMapped = row.studentId !== null && row.examScheduleId !== null;
    const examContext = isMapped
      ? buildExamContext(row, { includeStudentIdentity: false })
      : {
        subjectName: null,
        subjectCode: null,
        examType: null,
        examName: null,
        examDate: null,
        examTime: null,
        semesterId: null,
        sessionId: null,
        term: null,
      };

    return {
      id: row.id,
      qr: row.qr,
      requestId: row.requestId ?? null,
      studentId: row.studentId,
      examScheduleId: row.examScheduleId,
      assignedToUser: row.assignedToUser ?? null,
      assignedTeacherName: row.assignedTeacher?.userName || null,
      evaluatedAt: row.evaluatedAt ?? null,
      obtainedMarks: row.obtainedMarks ?? null,
      instituteId: row.instituteId,
      universityId: row.universityId,
      isMapped,
      ...examContext,
    };
  });
  return result;
}

export async function getAnswerSheetQrGenerationRequests(instituteId, universityId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const { groupedRows, totalRequests } = await answerSheetQrRepository.getAnswerSheetQrGenerationRequests(
    instituteId,
    universityId,
    limit,
    offset
  );

  const data = await Promise.all(
    groupedRows.map(async (request) => {
      const usageRows = await answerSheetQrRepository.getAnswerSheetQrUsageByRequestId(
        instituteId,
        universityId,
        request.requestId
      );

      let mappedQrs = 0;
      for (const row of usageRows) {
        if (row.studentId != null || row.examScheduleId != null) {
          mappedQrs++;
        }
      }

      const totalQrs = usageRows.length;
      const unmappedQrs = totalQrs - mappedQrs;

      return {
        requestId: request.requestId,
        totalQrs,
        mappedQrs,
        unmappedQrs,
        generatedAt: request.generatedAt,
      };
    })
  );

  return {
    data,
    paginationData: {
      total: totalRequests,
      page,
      limit,
      totalPages: Math.ceil(totalRequests / limit),
    },
  };
}

export async function getAnswerSheetQrsByRequestId(
  requestId,
  instituteId,
  universityId,
  page = 1,
  limit = 20
) {
  const offset = (page - 1) * limit;

  const { count, rows } = await answerSheetQrRepository.getAnswerSheetQrsByRequestId(
    instituteId,
    universityId,
    requestId,
    limit,
    offset
  );

  const data = rows.map((item) => ({
    id: item.id,
    qr: item.qr,
    requestId: item.requestId ?? null,
    studentId: item.studentId,
    examScheduleId: item.examScheduleId,
    assignedToUser: item.assignedToUser ?? null,
    assignedTeacherName: item.assignedTeacher?.userName || null,
    evaluatedAt: item.evaluatedAt ?? null,
    obtainedMarks: item.obtainedMarks ?? null,
    instituteId: item.instituteId,
    universityId: item.universityId,
    isUsed: item.studentId !== null || item.examScheduleId !== null,
    createdAt: item.createdAt,
    studentDisplayName:
      [item.student?.firstName, item.student?.middleName, item.student?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim(),
    enrollNumber: item.student?.enrollNumber || null,
    scholarNumber: item.student?.scholarNumber || null,
    subjectName: item.examSchedule?.subjectSchedule?.subjectName || null,
    subjectCode: item.examSchedule?.subjectSchedule?.subjectCode || null,
    examType: item.examSchedule?.examSetupTypeTerm?.examSetupType?.examType || null,
    examName: item.examSchedule?.examSetupTypeTerm?.examSetupType?.examName || null,
    examDate: item.examSchedule?.examDate || null,
    examTime: item.examSchedule?.examTime || null,
    semesterId: item.examSchedule?.semesterId || null,
    sessionId: item.examSchedule?.sessionId || null,
    term: item.examSchedule?.examSetupTypeTerm?.term || null,
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
    },
  };
}

export async function assignAnswerSheetsToTeachers(
  assignedToUserId,
  answerSheetQrIds,
  instituteId,
  universityId
) {
  const transaction = await sequelize.transaction();
  try {
    const teacher = await answerSheetQrRepository.getScopedUser(
      assignedToUserId,
      instituteId,
      universityId,
      transaction
    );
    if (!teacher) {
      throw createServiceError(`User not found for userId: ${assignedToUserId}`, 404);
    }

    const answerSheets = await answerSheetQrRepository.getAnswerSheetQrsByIds(
      answerSheetQrIds,
      instituteId,
      universityId,
      transaction
    );

    if (answerSheets.length !== answerSheetQrIds.length) {
      throw createServiceError("One or more answer sheet QR records were not found.", 404);
    }

    await answerSheetQrRepository.assignTeacherByAnswerSheetIds(
      answerSheetQrIds,
      assignedToUserId,
      instituteId,
      universityId,
      transaction
    );

    const result = {
      assignedCount: answerSheetQrIds.length,
      assignedToUserId,
      answerSheetQrIds,
    };
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getScriptsAssignedToTeacher(
  assignedToUserId,
  instituteId,
  universityId,
  page = 1,
  limit = 20
) {
  const teacher = await answerSheetQrRepository.getScopedUser(
    assignedToUserId,
    instituteId,
    universityId
  );
  if (!teacher) {
    throw createServiceError("Teacher user not found in your institute.", 404);
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await answerSheetQrRepository.getScriptsAssignedToTeacher(
    assignedToUserId,
    instituteId,
    universityId,
    limit,
    offset
  );

  const filteredrows = rows.map((item) => ({
    id: item.id,
    qr: item.qr,
    requestId: item.requestId ?? null,
    studentId: item.studentId,
    examScheduleId: item.examScheduleId,
    assignedToUser: item.assignedToUser ?? null,
    assignedTeacherName: item.assignedTeacher?.userName || null,
    assignedTeacherEmail: item.assignedTeacher?.email || null,
    evaluatedAt: item.evaluatedAt ?? null,
    obtainedMarks: item.obtainedMarks ?? null,
    studentDisplayName:
      [item.student?.firstName, item.student?.middleName, item.student?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
    enrollNumber: item.student?.enrollNumber || null,
    scholarNumber: item.student?.scholarNumber || null,
    subjectName: item.examSchedule?.subjectSchedule?.subjectName || null,
    subjectCode: item.examSchedule?.subjectSchedule?.subjectCode || null,
    examType: item.examSchedule?.examSetupTypeTerm?.examSetupType?.examType || null,
    examName: item.examSchedule?.examSetupTypeTerm?.examSetupType?.examName || null,
    examDate: item.examSchedule?.examDate || null,
    examTime: item.examSchedule?.examTime || null,
    semesterId: item.examSchedule?.semesterId || null,
    sessionId: item.examSchedule?.sessionId || null,
    term: item.examSchedule?.examSetupTypeTerm?.term || null,
    createdAt: item.createdAt,
  }));

  return {
    data: {
      filteredrows,
      teacher: {
        userId: teacher.userId,
        userName: teacher.userName,
        email: teacher.email,
      }
    },
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function assignObtainedMarksToAnswerSheet(
  answerSheetQrId,
  obtainedMarks,
  instituteId,
  universityId
) {
  const transaction = await sequelize.transaction();
  try {
    const answerSheet = await answerSheetQrRepository.getAnswerSheetQrById(
      answerSheetQrId,
      instituteId,
      universityId,
      transaction
    );

    if (!answerSheet) {
      throw createServiceError("Answer sheet QR not found.", 404);
    }

    await answerSheetQrRepository.assignMarksByAnswerSheetId(
      answerSheetQrId,
      obtainedMarks,
      new Date(),
      instituteId,
      universityId,
      transaction
    );

    const result = {
      answerSheetQrId,
      evaluatedAt: new Date(),
      obtained_marks: obtainedMarks,
      updated: true,
    };
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}


const PAGES_PER_STUDENT = 30;

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
 * @param {string} uploadedPdfPath - Absolute path to the uploaded PDF file
 * @param {number} instituteId
 * @param {number} universityId
 * @returns {Promise<{ totalStudents: number, results: Array<{ qr, filePath, studentId, examScheduleId }> }>}
 */
export async function splitAnswerSheetPdf(uploadedPdfPath, instituteId, universityId) {
  // ─── 1. Determine total page count ───────────────────────────────────────
  const srcPdfBytes = fs.readFileSync(uploadedPdfPath);
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw createServiceError("The uploaded PDF has no pages.", 400);
  }

  // QR pages: 0-indexed positions of pages 1, 31, 61, … → indices 0, 30, 60, …
  const qrPageIndices = [];
  for (let i = 0; i < totalPages; i += PAGES_PER_STUDENT) {
    qrPageIndices.push(i);
  }

  const totalSegments = qrPageIndices.length;

  // ─── 2. Prepare a temp directory for images ───────────────────────────────
  const tmpDir = path.join(__dirname, "..", "uploads", "tmp", `split-${uuidv4()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // ─── 3. Convert each QR page to an image and scan the QR ───────────────
    const scannedQrs = []; // [{ pageIndex, qrValue }]
    const scanErrors = []; // [{ page, reason }]

    for (const pageIndex of qrPageIndices) {
      const humanPage = pageIndex + 1; // 1-indexed for user messages
      let imagePath;

      try {
        imagePath = await convertPageToImage(uploadedPdfPath, pageIndex, tmpDir);
      } catch (convErr) {
        scanErrors.push({
          page: humanPage,
          reason: `Could not render page ${humanPage} to an image. ${convErr.message}`,
        });
        continue;
      }

      const qrValue = await scanQrFromImage(imagePath);

      if (!qrValue) {
        scanErrors.push({
          page: humanPage,
          reason:
            `No QR code was detected on page ${humanPage}. ` +
            `Please ensure a valid QR code is printed at the top-right corner of every ${PAGES_PER_STUDENT}th page (pages 1, 31, 61, …).`,
        });
      } else {
        scannedQrs.push({ pageIndex, qrValue });
      }
    }

    // ─── 4. If any QR scan failed → abort ──────────────────────────────────
    if (scanErrors.length > 0) {
      const details = scanErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
      const error = new Error(
        `QR scanning failed on ${scanErrors.length} of ${totalSegments} page(s). ` +
        `No files have been created. Please fix the issues and re-upload.\n\n${details}`
      );
      error.statusCode = 422;
      error.scanErrors = scanErrors;
      throw error;
    }

    // ─── 5. Validate all scanned QRs against the DB ────────────────────────
    const scannedValues = scannedQrs.map((s) => s.qrValue);

    const dbRows = await AnswerSheetQrModel.findAll({
      where: {
        qr: { [Op.in]: scannedValues },
        instituteId,
        universityId,
      },
      attributes: ["id", "qr", "studentId", "examScheduleId"],
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
      const details = validationErrors.map((e) => `  - Page ${e.page}: ${e.reason}`).join("\n");
      const error = new Error(
        `Validation failed for ${validationErrors.length} of ${totalSegments} answer sheet(s). ` +
        `No files have been created. Please resolve the issues and re-upload.\n\n${details}`
      );
      error.statusCode = 422;
      error.validationErrors = validationErrors;
      throw error;
    }

    // ─── 6. All validations passed — split and save PDFs ───────────────────
    const outputDir = path.join(__dirname, "..", "uploads", "answer-sheets");
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    for (let seg = 0; seg < scannedQrs.length; seg++) {
      const { pageIndex, qrValue } = scannedQrs[seg];
      const startPage = pageIndex;                          // 0-indexed, inclusive
      const endPage = startPage + PAGES_PER_STUDENT - 1;   // 0-indexed, inclusive

      const fileName = `${qrValue}.pdf`;
      const outputPath = path.join(outputDir, fileName);

      await extractPageRange(srcPdfBytes, startPage, endPage, outputPath);

      results.push({
        qr: qrValue,
        filePath: path.join("uploads", "answer-sheets", fileName),
        studentId: dbMap.get(qrValue).studentId,
        examScheduleId: dbMap.get(qrValue).examScheduleId,
      });
    }

    return { totalStudents: results.length, results };
  } finally {
    // Always clean up temp images, regardless of success or failure
    cleanupTmpDir(tmpDir);
  }
}



