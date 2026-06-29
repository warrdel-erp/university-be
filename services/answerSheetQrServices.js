import { v4 as uuidv4 } from "uuid";
import { UniqueConstraintError } from "sequelize";
import * as answerSheetQrRepository from "../repository/answerSheetQrRepository.js";
import sequelize from "../database/sequelizeConfig.js";

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

export async function generateBulkAnswerSheetQr(count) {
  const result = await sequelize.transaction(async (transaction) => {
    if (!Number.isInteger(count) || count <= 0) {
      throw createServiceError("Please provide a valid positive integer for count.", 400);
    }

    const unusedCount = await answerSheetQrRepository.countUnusedByInstitute(transaction);

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

export async function mapAnswerSheetQr(qr, studentId, examScheduleId) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const [student, examSchedule] = await Promise.all([
        answerSheetQrRepository.getScopedStudent(studentId, transaction),
        answerSheetQrRepository.getScopedExamSchedule(examScheduleId, transaction),
      ]);

      if (!student) throw createServiceError("Student not found in your institute.", 404);
      if (!examSchedule) throw createServiceError("Exam schedule not found in your institute.", 404);

      const hasHallTicket = await answerSheetQrRepository.hasStudentHallTicketForExamTerm(
        studentId,
        examSchedule.examSetupTypeTermId,
        examSchedule.sessionId,
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

export async function getAnswerSheetQrDetailById(id) {
  const result = await sequelize.transaction(async (transaction) => {
    const row = await answerSheetQrRepository.getAnswerSheetQrById(id, transaction);

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

export async function getAnswerSheetQrGenerationRequests(page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const { groupedRows, totalRequests } = await answerSheetQrRepository.getAnswerSheetQrGenerationRequests(
    limit,
    offset
  );

  const data = await Promise.all(
    groupedRows.map(async (request) => {
      const usageRows = await answerSheetQrRepository.getAnswerSheetQrUsageByRequestId(
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
  page = 1,
  limit = 20
) {
  const offset = (page - 1) * limit;

  const { count, rows } = await answerSheetQrRepository.getAnswerSheetQrsByRequestId(
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
) {
  const transaction = await sequelize.transaction();
  try {
    const teacher = await answerSheetQrRepository.getScopedUser(
      assignedToUserId,
      transaction
    );
    if (!teacher) {
      throw createServiceError(`User not found for userId: ${assignedToUserId}`, 404);
    }

    const answerSheets = await answerSheetQrRepository.getAnswerSheetQrsByIds(
      answerSheetQrIds,
      transaction
    );

    if (answerSheets.length !== answerSheetQrIds.length) {
      throw createServiceError("One or more answer sheet QR records were not found.", 404);
    }

    await answerSheetQrRepository.assignTeacherByAnswerSheetIds(
      answerSheetQrIds,
      assignedToUserId,
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
  page = 1,
  limit = 20
) {
  const teacher = await answerSheetQrRepository.getScopedUser(assignedToUserId);
  if (!teacher) {
    throw createServiceError("Teacher user not found in your institute.", 404);
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await answerSheetQrRepository.getScriptsAssignedToTeacher(
    assignedToUserId,
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
) {
  const transaction = await sequelize.transaction();
  try {
    const answerSheet = await answerSheetQrRepository.getAnswerSheetQrById(
      answerSheetQrId,
      transaction
    );

    if (!answerSheet) {
      throw createServiceError("Answer sheet QR not found.", 404);
    }

    await answerSheetQrRepository.assignMarksByAnswerSheetId(
      answerSheetQrId,
      obtainedMarks,
      new Date(),
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




