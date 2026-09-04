import { v4 as uuidv4 } from "uuid";
import { Op, UniqueConstraintError } from "sequelize";
import * as model from "../models/index.js";
import * as answerSheetQrRepository from "../repository/answerSheetQrRepository.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { buildTermName } from "../utility/courseTerms.js";
import * as s3Helper from "../utility/s3Helper.js";

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

function resolveExamScheduleTerm(examSchedule) {
  if (examSchedule?.term != null) return Number(examSchedule.term);
  return null;
}

function resolveExamScheduleTermType(examSchedule) {
  const termType = examSchedule?.subjectSchedule?.courseInfo?.termType;
  if (termType == null || String(termType).trim() === "") return null;
  return String(termType).trim();
}

function resolveExamTermName(examSchedule) {
  const term = resolveExamScheduleTerm(examSchedule);
  if (term == null) return null;
  const termType = examSchedule?.subjectSchedule?.courseInfo?.termType;
  return buildTermName(termType, term);
}

function buildExamContext(item, options = {}) {
  const { includeStudentIdentity = true } = options;
  const examSchedule = item?.examSchedule;
  const subject = examSchedule?.subjectSchedule;
  const course = subject?.courseInfo;
  const student = item?.student;
  const term = resolveExamScheduleTerm(examSchedule);
  const termType = resolveExamScheduleTermType(examSchedule);

  return {
    ...(includeStudentIdentity
      ? {
        studentDisplayName: getStudentDisplayName(student),
        enrollNumber: student?.enrollNumber || null,
        scholarNumber: student?.scholarNumber || null,
      }
      : {}),
    courseId: course?.courseId ?? null,
    courseName: course?.courseName || null,
    courseCode: course?.courseCode || null,
    subjectName: subject?.subjectName || null,
    subjectCode: subject?.subjectCode || null,
    examType: examSchedule?.type || null,
    examName: null,
    examDate: examSchedule?.examDate || null,
    examTime: examSchedule?.examTime || null,
    maximumMarks:
      examSchedule?.maximumMarks != null
        ? Number(examSchedule.maximumMarks)
        : null,
    term,
    termType,
    sessionId: examSchedule?.sessionId || null,
  };
}

const examScheduleSubjectInclude = [
  {
    model: model.subjectModel,
    as: "subjectSchedule",
    attributes: [],
    required: true,
  },
];

function intersectExamScheduleIds(scheduleIds, examScheduleId) {
  if (!examScheduleId || !examScheduleId.length) {
    return scheduleIds;
  }

  const allowed = new Set();
  for (const id of examScheduleId) {
    allowed.add(Number(id));
  }

  const filtered = [];
  for (const scheduleId of scheduleIds) {
    if (allowed.has(Number(scheduleId))) {
      filtered.push(scheduleId);
    }
  }

  return filtered;
}

async function resolveExamScheduleIdsFromSelections(
  examinationSessionId,
  selections,
) {
  const mappingIds = [];
  for (const selection of selections) {
    mappingIds.push(selection.courseSessionMappingId);
  }

  const mappings =
    await examinationSessionRepository.findSessionCourseMappingsByIds(mappingIds);
  const mappingById = new Map();
  for (const mapping of mappings) {
    mappingById.set(mapping.sessionCourseMappingId, mapping);
  }

  const selectionOr = [];
  for (const selection of selections) {
    const mapping = mappingById.get(selection.courseSessionMappingId);
    if (!mapping) {
      continue;
    }

    const clause = {
      sessionId: mapping.sessionId,
      "$subjectSchedule.course_id$": mapping.courseId,
    };
    if (selection.terms.length > 0) {
      clause.term = { [Op.in]: selection.terms };
    }
    selectionOr.push(clause);
  }

  if (!selectionOr.length) {
    return [];
  }

  const rows = await answerSheetQrRepository.findExamScheduleIdsByWhere(
    {
      examinationSessionId: Number(examinationSessionId),
      [Op.or]: selectionOr,
    },
    { include: examScheduleSubjectInclude },
  );

  const examScheduleIds = [];
  for (const row of rows) {
    examScheduleIds.push(row.examScheduleId);
  }

  return examScheduleIds;
}

async function resolveMappedListExamScheduleIds(
  examinationSessionId,
  { selections, examScheduleId },
) {
  if (selections && selections.length > 0) {
    const scheduleIds = await resolveExamScheduleIdsFromSelections(
      examinationSessionId,
      selections,
    );
    if (!scheduleIds.length) {
      return null;
    }

    const resolved = intersectExamScheduleIds(scheduleIds, examScheduleId);
    return resolved.length ? resolved : null;
  }

  if (examScheduleId && examScheduleId.length > 0) {
    return examScheduleId;
  }

  return undefined;
}

function buildMappedExamScheduleWhere(
  examinationSessionId,
  { examDate, examinationSessionSlotId, examScheduleIds, term, subjectId, selections },
) {
  const where = { examinationSessionId: Number(examinationSessionId) };

  if (examDate) {
    where.examDate = examDate;
  }

  if (examinationSessionSlotId) {
    where.examinationSessionSlotId = Number(examinationSessionSlotId);
  }

  if (examScheduleIds && examScheduleIds.length > 0) {
    where.examScheduleId = { [Op.in]: examScheduleIds };
  }

  if (!selections?.length && term && term.length > 0) {
    where.term = { [Op.in]: term };
  }

  if (subjectId && subjectId.length > 0) {
    where.subjectId = { [Op.in]: subjectId };
  }

  return where;
}

function buildMappedAnswerSheetQrWhere(status) {
  const qrWhere = {
    studentId: { [Op.ne]: null },
    examScheduleId: { [Op.ne]: null },
  };

  if (status === "unassigned") {
    qrWhere.assignedToUser = null;
  } else if (status === "graded") {
    // checked = final submit
    qrWhere.markingStatus = "submit";
  }

  return qrWhere;
}

function buildMappedListFilters({
  examinationSessionId,
  examScheduleId,
  term,
  selections,
  examDate,
  examinationSessionSlotId,
  subjectId,
  search,
  status,
}) {
  return {
    examinationSessionId,
    examScheduleId: examScheduleId || [],
    term: term || [],
    selections: selections || [],
    examDate: examDate || null,
    examinationSessionSlotId: examinationSessionSlotId || null,
    subjectId: subjectId || [],
    search: search || null,
    status: status || null,
  };
}

function emptyMappedListResponse(filters, page, limit) {
  return {
    data: {
      filters,
      items: [],
    },
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
}

async function resolveMappedListQueryContext({
  examinationSessionId,
  page = 1,
  limit = 20,
  examScheduleId,
  term,
  subjectId,
  search,
  examDate,
  examinationSessionSlotId,
  selections,
  status,
}) {
  const filters = buildMappedListFilters({
    examinationSessionId,
    examScheduleId,
    term,
    selections,
    examDate,
    examinationSessionSlotId,
    subjectId,
    search,
    status,
  });

  const resolvedExamScheduleIds = await resolveMappedListExamScheduleIds(
    examinationSessionId,
    { selections, examScheduleId },
  );

  if (resolvedExamScheduleIds === null) {
    return {
      empty: true,
      response: emptyMappedListResponse(filters, page, limit),
    };
  }

  return {
    empty: false,
    page,
    limit,
    filters,
    search: search || null,
    examScheduleWhere: buildMappedExamScheduleWhere(examinationSessionId, {
      examDate,
      examinationSessionSlotId,
      examScheduleIds: resolvedExamScheduleIds,
      term,
      subjectId,
      selections,
    }),
    qrWhere: buildMappedAnswerSheetQrWhere(status),
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

      const hasHallTicket = await answerSheetQrRepository.hasStudentHallTicketForExamSession(
        studentId,
        examSchedule.examinationSessionId,
        transaction
      );
      if (!hasHallTicket) {
        throw createServiceError(
          "Student does not have a hall ticket for this examination session.",
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
        courseId: null,
        courseName: null,
        courseCode: null,
        subjectName: null,
        subjectCode: null,
        examType: null,
        examName: null,
        examDate: null,
        examTime: null,
        maximumMarks: null,
        term: null,
        termType: null,
        sessionId: null,
      };

    return {
      id: row.id,
      qr: row.qr,
      requestId: row.requestId ?? null,
      studentId: row.studentId,
      examScheduleId: row.examScheduleId,
      assignedToUser: row.assignedToUser ?? null,
      deadlineDate: row.deadlineDate ?? null,
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

  const data = rows.map((item) => {
    const term = resolveExamScheduleTerm(item.examSchedule);
    const termName = resolveExamTermName(item.examSchedule);

    return {
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
      examType: item.examSchedule?.type || null,
      examName: null,
      examDate: item.examSchedule?.examDate || null,
      examTime: item.examSchedule?.examTime || null,
      term,
      termName,
      semesterId: null,
      semesterName: termName,
      sessionId: item.examSchedule?.sessionId || null,
    };
  });

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
  deadlineDate,
  notes,
  createdBy,
) {
  const uniqueAnswerSheetQrIds = [];
  const seenIds = new Set();
  for (const answerSheetQrId of answerSheetQrIds) {
    const id = Number(answerSheetQrId);
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    uniqueAnswerSheetQrIds.push(id);
  }

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
      uniqueAnswerSheetQrIds,
      transaction
    );

    if (answerSheets.length !== uniqueAnswerSheetQrIds.length) {
      throw createServiceError("One or more answer sheet QR records were not found.", 404);
    }

    const unmappedIds = [];

    for (const answerSheet of answerSheets) {
      if (!answerSheet.studentId || !answerSheet.examScheduleId) {
        unmappedIds.push(answerSheet.id);
      }
    }

    if (unmappedIds.length > 0) {
      throw createServiceError(
        `Answer sheet QR records must be mapped before evaluator assignment: ${unmappedIds.join(", ")}`,
        400,
      );
    }

    const assignment = await answerSheetQrRepository.createEvaluationUserAssignment(
      {
        assignedToUserId: Number(assignedToUserId),
        notes: notes || null,
        timestamp: new Date(),
        createdBy,
        updatedBy: createdBy,
      },
      transaction,
    );

    const assignmentId = assignment.assignmentId;

    await answerSheetQrRepository.assignTeacherByAnswerSheetIds(
      uniqueAnswerSheetQrIds,
      assignedToUserId,
      deadlineDate,
      assignmentId,
      transaction
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getScriptsAssignedToTeacher(
  assignedToUserId,
  page = 1,
  limit = 20,
  examinationSessionId,
  examScheduleId,
  status,
) {
  const teacher = await answerSheetQrRepository.getScopedUser(assignedToUserId);
  if (!teacher) {
    throw createServiceError("Teacher user not found in your institute.", 404);
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await answerSheetQrRepository.getScriptsAssignedToTeacher(
    assignedToUserId,
    limit,
    offset,
    examinationSessionId,
    examScheduleId,
    status,
  );

  const items = [];
  const urlJobs = [];

  for (const row of rows) {
    const item = row.get({ plain: true });
    const examContext = buildExamContext(item, { includeStudentIdentity: true });
    const s3File = item.s3File
      ? {
          id: item.s3File.id,
          status: item.s3File.status,
          s3Key: item.s3File.s3Key,
          url: null,
        }
      : null;

    if (s3File && s3File.s3Key) {
      urlJobs.push(
        s3Helper.getDownloadSignedUrl(s3File.s3Key).then((url) => {
          s3File.url = url;
        }),
      );
    }

    items.push({
      id: item.id,
      qr: item.qr,
      requestId: item.requestId ?? null,
      studentId: item.studentId,
      examScheduleId: item.examScheduleId,
      assignedToUser: item.assignedToUser ?? null,
      deadlineDate: item.deadlineDate ?? null,
      assignedTeacherName: item.assignedTeacher?.userName || null,
      assignedTeacherEmail: item.assignedTeacher?.email || null,
      evaluatedAt: item.evaluatedAt ?? null,
      obtainedMarks: item.obtainedMarks ?? null,
      markingStatus: item.markingStatus ?? "pending",
      fileUploadId: item.fileUploadId ?? null,
      s3File,
      ...examContext,
      createdAt: item.createdAt,
    });
  }

  if (urlJobs.length > 0) {
    await Promise.all(urlJobs);
  }

  return {
    data: {
      items,
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

const MY_ANSWER_SHEET_SKU_LABELS = {
  totalAssigned: "Total Assigned",
  graded: "Graded",
  notChecked: "Not Checked",
  overdue: "Overdue",
  dueToday: "Due Today",
};

function buildSkuResponse(stats) {
  const sku = [];
  for (const key of Object.keys(MY_ANSWER_SHEET_SKU_LABELS)) {
    sku.push({
      key,
      label: MY_ANSWER_SHEET_SKU_LABELS[key],
      value: stats[key] ?? 0,
    });
  }
  return { sku };
}

export async function getMyAnswerSheetSkuStats(assignedToUserId) {
  const stats = await answerSheetQrRepository.findMyAnswerSheetSkuStats(
    assignedToUserId,
  );
  return buildSkuResponse(stats);
}

export async function getAnswerSheetSkuStatsByExaminationSession(
  examinationSessionId,
) {
  const stats =
    await answerSheetQrRepository.findAnswerSheetSkuStatsByExaminationSession(
      Number(examinationSessionId),
    );
  return buildSkuResponse(stats);
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

    const evaluatedAt = new Date();
    await answerSheetQrRepository.assignMarksByAnswerSheetId(
      answerSheetQrId,
      obtainedMarks,
      evaluatedAt,
      transaction
    );

    const result = {
      answerSheetQrId,
      evaluatedAt,
      obtained_marks: obtainedMarks,
      markingStatus: "pending",
      updated: true,
    };
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Bulk final-submit answer sheets.
 * Sets markingStatus to "submit". Existing obtained_marks are kept unless an item
 * optionally sends obtained_marks. When assignedToUserId is provided, only that
 * user's sheets are updated.
 */
export async function bulkFinalSubmitObtainedMarks(items, assignedToUserId) {
  const seenIds = new Set();
  const uniqueIds = [];
  const marksById = new Map();

  for (const item of items) {
    const answerSheetQrId =
      typeof item === "number" ? item : Number(item.answerSheetQrId);
    if (seenIds.has(answerSheetQrId)) {
      continue;
    }
    seenIds.add(answerSheetQrId);
    uniqueIds.push(answerSheetQrId);

    if (typeof item === "object" && item.obtained_marks !== undefined) {
      marksById.set(answerSheetQrId, item.obtained_marks);
    }
  }

  const transaction = await sequelize.transaction();
  try {
    const existingCount = await answerSheetQrRepository.countAnswerSheetQrsByIds(
      uniqueIds,
      transaction,
    );
    if (existingCount !== uniqueIds.length) {
      throw createServiceError(
        "One or more answer sheet QR records were not found.",
        404,
      );
    }

    const evaluatedAt = new Date();
    const idsStatusOnly = [];

    for (const answerSheetQrId of uniqueIds) {
      if (!marksById.has(answerSheetQrId)) {
        idsStatusOnly.push(answerSheetQrId);
        continue;
      }

      const affected =
        await answerSheetQrRepository.finalSubmitWithObtainedMarksById(
          answerSheetQrId,
          marksById.get(answerSheetQrId),
          assignedToUserId,
          evaluatedAt,
          transaction,
        );
      if (affected !== 1) {
        throw createServiceError(
          assignedToUserId != null
            ? `Answer sheet ${answerSheetQrId} is not assigned to the current user.`
            : `Answer sheet ${answerSheetQrId} could not be submitted.`,
          assignedToUserId != null ? 403 : 404,
        );
      }
    }

    if (idsStatusOnly.length > 0) {
      const submittedCount =
        await answerSheetQrRepository.bulkFinalSubmitByIds(
          idsStatusOnly,
          assignedToUserId,
          evaluatedAt,
          transaction,
        );

      if (submittedCount !== idsStatusOnly.length) {
        throw createServiceError(
          assignedToUserId != null
            ? "One or more answer sheets are not assigned to the current user."
            : "One or more answer sheet QR records could not be submitted.",
          assignedToUserId != null ? 403 : 404,
        );
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getMappedAnswerSheetsByExamSession(params) {
  const context = await resolveMappedListQueryContext(params);
  if (context.empty) {
    return context.response;
  }

  const { page, limit, filters, examScheduleWhere, qrWhere, search } = context;
  const offset = (page - 1) * limit;

  const { count, rows } = await answerSheetQrRepository.findAndCountMappedAnswerSheets(
    qrWhere,
    examScheduleWhere,
    limit,
    offset,
    { search },
  );

  const items = [];
  const urlJobs = [];
  for (const row of rows) {
    const plain = row.get({ plain: true });
    plain.markingStatus = plain.markingStatus ?? "pending";
    items.push(plain);
    if (plain.s3File && plain.s3File.s3Key) {
      urlJobs.push(
        s3Helper.getDownloadSignedUrl(plain.s3File.s3Key).then((url) => {
          plain.s3File.url = url;
        }),
      );
    }
  }
  await Promise.all(urlJobs);

  return {
    data: {
      filters,
      items,
    },
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 0,
    },
  };
}

export async function listEvaluationAssignmentsByExamSession(params) {
  const context = await resolveMappedListQueryContext({
    ...params,
    status: null,
  });
  if (context.empty) {
    return context.response;
  }

  const { page, limit, filters, examScheduleWhere, search } = context;
  const offset = (page - 1) * limit;

  const qrWhere = buildMappedAnswerSheetQrWhere(null);
  qrWhere.assignedToUser = { [Op.ne]: null };
  qrWhere.assignmentId = { [Op.ne]: null };

  const { count, rows } = await answerSheetQrRepository.findAndCountMappedAssignments(
    qrWhere,
    examScheduleWhere,
    limit,
    offset,
    { search },
  );

  const items = [];
  for (const row of rows) {
    const plain = row.get({ plain: true });
    const answerSheets = plain.answerSheetQrs || [];

    const examScheduleById = new Map();
    let total = 0;
    let graded = 0;
    let deadlineDate = null;
    let assignedAt = null;

    for (const sheet of answerSheets) {
      total += 1;

      if (sheet.markingStatus === "submit") {
        graded += 1;
      }

      if (
        sheet.deadlineDate &&
        (!deadlineDate || sheet.deadlineDate > deadlineDate)
      ) {
        deadlineDate = sheet.deadlineDate;
      }

      if (
        sheet.updatedAt &&
        (!assignedAt || sheet.updatedAt < assignedAt)
      ) {
        assignedAt = sheet.updatedAt;
      }

      const scheduleId = sheet.examScheduleId;
      let scheduleGroup = examScheduleById.get(scheduleId);
      if (!scheduleGroup) {
        const schedule = sheet.examSchedule;
        scheduleGroup = {
          examScheduleId: schedule.examScheduleId,
          examDate: schedule.examDate,
          examTime: schedule.examTime,
          term: schedule.term,
          type: schedule.type,
          subjectSchedule: schedule.subjectSchedule
            ? {
                subjectName: schedule.subjectSchedule.subjectName,
                subjectCode: schedule.subjectSchedule.subjectCode,
              }
            : null,
          totalScripts: 0,
          gradedScripts: 0,
        };
        examScheduleById.set(scheduleId, scheduleGroup);
      }

      scheduleGroup.totalScripts += 1;
      if (sheet.markingStatus === "submit") {
        scheduleGroup.gradedScripts += 1;
      }
    }

    const examSchedules = [];
    for (const scheduleGroup of examScheduleById.values()) {
      examSchedules.push({
        examScheduleId: scheduleGroup.examScheduleId,
        examDate: scheduleGroup.examDate,
        examTime: scheduleGroup.examTime,
        term: scheduleGroup.term,
        type: scheduleGroup.type,
        subjectSchedule: scheduleGroup.subjectSchedule,
        totalScripts: scheduleGroup.totalScripts,
        gradedScripts: scheduleGroup.gradedScripts,
        remainingScripts:
          scheduleGroup.totalScripts - scheduleGroup.gradedScripts,
      });
    }

    items.push({
      assignmentId: plain.assignmentId,
      deadlineDate,
      assignedAt,
      totalScripts: total,
      gradedScripts: graded,
      remainingScripts: total - graded,
      assignmentStatus: resolveAssignmentStatus({
        graded,
        totalAssigned: total,
      }),
      examSchedules,
      assignment: {
        assignmentId: plain.assignmentId,
        notes: plain.notes,
        timestamp: plain.timestamp,
        academicYearId: plain.academicYearId,
        createdBy: plain.createdBy,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
        assignedEvaluator: plain.assignedEvaluator,
      },
    });
  }

  return {
    data: {
      filters: {
        ...filters,
        status: "withEvaluator",
      },
      items,
    },
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 0,
    },
  };
}

export async function getMySingleAssignedScript(id, assignedToUserId) {
  const row = await answerSheetQrRepository.getMySingleAssignedScript(id, assignedToUserId);
  if (!row) {
    throw createServiceError("Assigned script not found", 404);
  }

  const plain = row.get({ plain: true });
  if (plain.s3File && plain.s3File.s3Key) {
    plain.s3File.url = await s3Helper.getDownloadSignedUrl(plain.s3File.s3Key);
  }

  return {
    id: plain.id,
    qr: plain.qr,
    requestId: plain.requestId ?? null,
    examScheduleId: plain.examScheduleId,
    assignedToUser: plain.assignedToUser ?? null,
    deadlineDate: plain.deadlineDate ?? null,
    evaluatedAt: plain.evaluatedAt ?? null,
    obtainedMarks: plain.obtainedMarks ?? null,
    markingStatus: plain.markingStatus ?? "pending",
    fileUploadId: plain.fileUploadId,
    createdAt: plain.createdAt,
    ...buildExamContext(plain, { includeStudentIdentity: false }),
    s3File: plain.s3File ?? null,
  };
}

/**
 * Approved question paper for an answer sheet's exam schedule.
 * When assignedToUserId is set, the sheet must belong to that evaluator.
 */
export async function getApprovedQuestionPaperByAnswerSheetId(
  answerSheetQrId,
  assignedToUserId,
) {
  const answerSheet =
    await answerSheetQrRepository.findAnswerSheetByIdForQuestionPaper(
      answerSheetQrId,
      assignedToUserId,
    );

  if (!answerSheet) {
    throw createServiceError(
      assignedToUserId != null
        ? "Assigned answer sheet not found."
        : "Answer sheet QR not found.",
      404,
    );
  }

  if (answerSheet.examScheduleId == null) {
    throw createServiceError(
      "Answer sheet is not mapped to an exam schedule.",
      404,
    );
  }

  const questionPaper =
    await answerSheetQrRepository.findApprovedQuestionPaperByExamScheduleId(
      answerSheet.examScheduleId,
    );

  if (!questionPaper) {
    throw createServiceError(
      "Approved question paper not found for this answer sheet.",
      404,
    );
  }

  const plain = questionPaper.get({ plain: true });
  if (typeof plain.questionPaper === "string") {
    plain.questionPaper = JSON.parse(plain.questionPaper);
  }

  return plain;
}

function resolveAssignmentStatus(counts) {
  const graded = counts.graded;
  const total = counts.totalAssigned;
  if (graded === total && total > 0) {
    return "completed";
  }
  if (graded > 0) {
    return "inprogress";
  }
  return "pending";
}

export async function getEvaluationAssignmentDetail(assignmentId) {
  const assignment = await answerSheetQrRepository.getEvaluationAssignmentById(
    assignmentId,
  );
  if (!assignment) {
    throw createServiceError("Evaluation assignment not found", 404);
  }

  const [stats, answerSheetRows] = await Promise.all([
    answerSheetQrRepository.findAssignmentAnswerSheetStats(assignmentId),
    answerSheetQrRepository.findAnswerSheetsByAssignmentId(assignmentId),
  ]);

  const urlJobs = [];
  const answerSheets = [];
  for (const row of answerSheetRows) {
    const plain = row.get({ plain: true });
    answerSheets.push({
      id: plain.id,
      qr: plain.qr,
      requestId: plain.requestId ?? null,
      examScheduleId: plain.examScheduleId,
      assignedToUser: plain.assignedToUser ?? null,
      assignmentId: plain.assignmentId ?? null,
      deadlineDate: plain.deadlineDate ?? null,
      evaluatedAt: plain.evaluatedAt ?? null,
      obtainedMarks: plain.obtainedMarks ?? null,
      markingStatus: plain.markingStatus ?? "pending",
      fileUploadId: plain.fileUploadId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      assignedTeacher: plain.assignedTeacher ?? null,
      examSchedule: plain.examSchedule ?? null,
      ...buildExamContext(plain, { includeStudentIdentity: false }),
      s3File: plain.s3File ?? null,
    });
    if (plain.s3File && plain.s3File.s3Key) {
      urlJobs.push(
        s3Helper.getDownloadSignedUrl(plain.s3File.s3Key).then((url) => {
          answerSheets[answerSheets.length - 1].s3File.url = url;
        }),
      );
    }
  }
  await Promise.all(urlJobs);

  const assignmentPlain = assignment.get({ plain: true });
  const counts = {
    ...stats,
    remaining: stats.notChecked,
    assignmentStatus: resolveAssignmentStatus(stats),
  };

  return {
    assignment: assignmentPlain,
    counts,
    deadlineDate: stats.deadlineDate,
    answerSheets,
  };
}

export async function getEvaluationAssignmentById(assignmentId) {
  const assignment = await answerSheetQrRepository.getEvaluationAssignmentById(assignmentId);
  if (!assignment) throw createServiceError("Assignment not found", 404);

  const stats = await answerSheetQrRepository.findAssignmentAnswerSheetStats(assignmentId);
  const answerSheets = await answerSheetQrRepository.findAnswerSheetsByAssignmentId(assignmentId);

  const plainAnswerSheets = answerSheets.map((row) => row.get({ plain: true }));
  const urlJobs = plainAnswerSheets.map((sheet) => {
    if (sheet.s3File && sheet.s3File.s3Key) {
      return s3Helper.getDownloadSignedUrl(sheet.s3File.s3Key).then((url) => {
        sheet.s3File.url = url;
      });
    }
    return Promise.resolve();
  });
  await Promise.all(urlJobs);

  return {
    assignment: assignment.get({ plain: true }),
    stats,
    answerSheets: plainAnswerSheets,
  };
}

/**
 * Reverse-populate examination sessions for the logged-in evaluator.
 * Shape is association-driven: session → terms + examSchedules → subject → course.
 * examinationSessionTerms are limited to terms present on assigned examSchedules
 * (same courseId / sessionId context as those schedules).
 */
export async function getMyEvaluationExaminationSessions(assignedToUserId) {
  const rows =
    await answerSheetQrRepository.findMyEvaluationExaminationSessions(
      assignedToUserId,
    );

  const items = [];
  for (const row of rows) {
    const plain = row.get({ plain: true });
    const examSchedules = plain.examSchedules || [];
    const scheduleTerms = new Set();

    for (const schedule of examSchedules) {
      const sheets = schedule.answerSheetQrs || [];
      let graded = 0;
      for (const sheet of sheets) {
        if (sheet.markingStatus === "submit") {
          graded += 1;
        }
      }
      schedule.totalAssigned = sheets.length;
      schedule.graded = graded;
      schedule.remaining = sheets.length - graded;
      delete schedule.answerSheetQrs;

      if (schedule.term != null) {
        scheduleTerms.add(Number(schedule.term));
      }
    }

    const examinationSessionTerms = [];
    for (const sessionTerm of plain.examinationSessionTerms || []) {
      if (scheduleTerms.has(Number(sessionTerm.term))) {
        examinationSessionTerms.push(sessionTerm);
      }
    }
    plain.examinationSessionTerms = examinationSessionTerms;

    items.push(plain);
  }

  return { items };
}
