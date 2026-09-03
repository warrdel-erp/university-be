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

function buildMappedAnswerSheetQrWhere(search, status) {
  const qrWhere = {
    studentId: { [Op.ne]: null },
    examScheduleId: { [Op.ne]: null },
  };

  if (status === "unassigned") {
    qrWhere.assignedToUser = null;
  } else if (status === "graded") {
    qrWhere.evaluatedAt = { [Op.ne]: null };
  } else if (status === "withEvaluator") {
    qrWhere.assignedToUser = { [Op.ne]: null };
  }

  if (search) {
    const like = `%${search}%`;
    qrWhere[Op.or] = [
      { "$examSchedule.subjectSchedule.subject_name$": { [Op.like]: like } },
      { "$examSchedule.subjectSchedule.subject_code$": { [Op.like]: like } },
    ];
  }

  return qrWhere;
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

  const items = rows.map((item) => {
    const examContext = buildExamContext(item, { includeStudentIdentity: true });

    return {
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
      ...examContext,
      createdAt: item.createdAt,
    };
  });

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

function buildMyAnswerSheetSkuResponse(stats) {
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
  return buildMyAnswerSheetSkuResponse(stats);
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
      updated: true,
    };
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getMappedAnswerSheetsByExamSession({
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
  const offset = (page - 1) * limit;

  const resolvedExamScheduleIds = await resolveMappedListExamScheduleIds(
    examinationSessionId,
    { selections, examScheduleId },
  );

  if (resolvedExamScheduleIds === null) {
    return {
      data: {
        filters: {
          examinationSessionId,
          examScheduleId: examScheduleId || [],
          term: term || [],
          selections: selections || [],
          examDate: examDate || null,
          examinationSessionSlotId: examinationSessionSlotId || null,
          subjectId: subjectId || [],
          search: search || null,
          status: status || null,
        },
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

  const examScheduleWhere = buildMappedExamScheduleWhere(examinationSessionId, {
    examDate,
    examinationSessionSlotId,
    examScheduleIds: resolvedExamScheduleIds,
    term,
    subjectId,
    selections,
  });
  const qrWhere = buildMappedAnswerSheetQrWhere(search, status);

  let count = 0;
  let rows = [];

  if (status === "withEvaluator") {
    const result = await answerSheetQrRepository.findAndCountMappedAssignments(
      qrWhere,
      examScheduleWhere,
      limit,
      offset,
    );
    count = result.count;
    rows = result.rows;
  } else {
    const result = await answerSheetQrRepository.findAndCountMappedAnswerSheets(
      qrWhere,
      examScheduleWhere,
      limit,
      offset,
    );
    count = result.count;
    rows = result.rows;
  }

  let items = [];
  if (status === "withEvaluator") {
    items = rows.map((row) => {
      const plain = row.get({ plain: true });
      let assignmentStatus = "pending";
      const graded = Number(plain.gradedScripts || 0);
      const total = Number(plain.totalScripts || 0);
      if (graded === total && total > 0) assignmentStatus = "completed";
      else if (graded > 0) assignmentStatus = "inprogress";
      
      return {
        assignmentId: plain.assignmentId,
        assignedToUser: plain.assignedToUser,
        examScheduleId: plain.examScheduleId,
        deadlineDate: plain.deadlineDate,
        totalScripts: total,
        gradedScripts: graded,
        remainingScripts: Number(plain.remainingScripts || 0),
        assignedAt: plain.assignedAt,
        assignmentStatus,
        examSchedule: plain.examSchedule,
        assignedTeacher: plain.assignedTeacher,
        assignment: plain.evaluationAssignment,
      };
    });
  } else {
    const urlJobs = [];
    for (const row of rows) {
      const plain = row.get({ plain: true });
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
  }

  return {
    data: {
      filters: {
        examinationSessionId,
        examScheduleId: examScheduleId || [],
        term: term || [],
        selections: selections || [],
        examDate: examDate || null,
        examinationSessionSlotId: examinationSessionSlotId || null,
        subjectId: subjectId || [],
        search: search || null,
        status: status || null,
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
    fileUploadId: plain.fileUploadId,
    createdAt: plain.createdAt,
    ...buildExamContext(plain, { includeStudentIdentity: false }),
    s3File: plain.s3File ?? null,
  };
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
