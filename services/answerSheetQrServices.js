import { v4 as uuidv4 } from "uuid";
import * as answerSheetQrRepository from "../repository/answerSheetQrRepository.js";
import sequelize from "../database/sequelizeConfig.js";

const MAX_UNUSED_QR_PER_INSTITUTE = 5000;
const MAX_BULK_GENERATION_PER_REQUEST = 5000;

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
  return sequelize.transaction(async (transaction) => {
    if (!Number.isInteger(count) || count <= 0) {
      throw createServiceError("Please provide a valid positive integer for count.", 400);
    }

    if (count > MAX_BULK_GENERATION_PER_REQUEST) {
      throw createServiceError(
        `You can generate up to ${MAX_BULK_GENERATION_PER_REQUEST} QR codes in one request.`,
        400
      );
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

    const payload = Array.from({ length: count }, () => ({
      qr: uuidv4(),
      instituteId,
      universityId,
    }));

    const created = await answerSheetQrRepository.bulkCreateAnswerSheetQr(payload, transaction);

    return {
      createdCount: created.length,
      unusedCountAfterCreation: unusedCount + created.length,
      items: created,
    };
  });
}

export async function getAnswerSheetQrList(instituteId, universityId, page = 1, limit = 20) {
  return sequelize.transaction(async (transaction) => {
    const safePage = Number(page);
    const safeLimit = Number(limit);

    if (!Number.isInteger(safePage) || safePage <= 0) {
      throw createServiceError("Page must be a positive integer.", 400);
    }

    if (!Number.isInteger(safeLimit) || safeLimit <= 0 || safeLimit > 100) {
      throw createServiceError("Limit must be between 1 and 100.", 400);
    }

    const offset = (safePage - 1) * safeLimit;

    const { count, rows } = await answerSheetQrRepository.getAnswerSheetQrs(
      instituteId,
      universityId,
      safeLimit,
      offset,
      transaction
    );

    return {
      data: rows.map((item) => ({
        id: item.id,
        qr: item.qr,
        studentId: item.studentId,
        examScheduleId: item.examScheduleId,
        instituteId: item.instituteId,
        universityId: item.universityId,
        createdAt: item.createdAt,
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
      },
    };
  });
}

export async function getAnswerSheetQrListSecure(
  instituteId,
  universityId,
  page = 1,
  limit = 20,
  usageType = "all",
  includeQr = false
) {
  return sequelize.transaction(async (transaction) => {
    const safePage = Number(page);
    const safeLimit = Number(limit);
    if (!Number.isInteger(safePage) || safePage <= 0) {
      throw createServiceError("Page must be a positive integer.", 400);
    }

    if (!Number.isInteger(safeLimit) || safeLimit <= 0 || safeLimit > 100) {
      throw createServiceError("Limit must be between 1 and 100.", 400);
    }

    if (!["all", "used", "unused"].includes(usageType)) {
      throw createServiceError("usageType must be one of: all, used, unused.", 400);
    }

    const offset = (safePage - 1) * safeLimit;

    const { count, rows } = await answerSheetQrRepository.getAnswerSheetQrsByUsage(
      instituteId,
      universityId,
      usageType,
      safeLimit,
      offset,
      transaction
    );

    return {
      data: rows.map((item) => ({
        id: item.id,
        qr: item.qr,
        studentId: item.studentId,
        examScheduleId: item.examScheduleId,
        instituteId: item.instituteId,
        universityId: item.universityId,
        isUsed: item.studentId !== null || item.examScheduleId !== null,
        createdAt: item.createdAt,
        ...(item.studentId !== null || item.examScheduleId !== null ? buildExamContext(item) : {}),
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
      },
    };
  });
}

export async function mapAnswerSheetQr(qr, studentId, examScheduleId, instituteId, universityId) {
  return sequelize.transaction(async (transaction) => {
    if (!studentId || !examScheduleId) {
      throw createServiceError("Both studentId and examScheduleId are required for mapping.", 400);
    }

    if (studentId) {
      const student = await answerSheetQrRepository.getScopedStudent(
        studentId,
        instituteId,
        universityId,
        transaction
      );
      if (!student) {
        throw createServiceError("Student not found in your institute.", 404);
      }
    }

    if (examScheduleId) {
      const examSchedule = await answerSheetQrRepository.getScopedExamSchedule(
        examScheduleId,
        instituteId,
        universityId,
        transaction
      );
      if (!examSchedule) {
        throw createServiceError("Exam schedule not found in your institute.", 404);
      }
    }

    const mappingPayload = {
      ...(studentId && { studentId }),
      ...(examScheduleId && { examScheduleId }),
    };

    const result = await answerSheetQrRepository.mapAnswerSheetQrOnce(
      qr,
      mappingPayload,
      instituteId,
      universityId,
      transaction
    );

    if (!result) {
      throw createServiceError("QR code not found.", 404);
    }

    if (result.examScheduleAlreadyMapped) {
      throw createServiceError(
        "This exam schedule is already mapped to another answer sheet QR.",
        409
      );
    }

    return {
      id: result.row.id,
      qr: result.row.qr,
      studentId: result.row.studentId,
      examScheduleId: result.row.examScheduleId,
      instituteId: result.row.instituteId,
      universityId: result.row.universityId,
    };
  });
}

export async function getAnswerSheetQrDetailById(id, instituteId, universityId) {
  return sequelize.transaction(async (transaction) => {
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
      studentId: row.studentId,
      examScheduleId: row.examScheduleId,
      instituteId: row.instituteId,
      universityId: row.universityId,
      isMapped,
      ...examContext,
    };
  });
}
