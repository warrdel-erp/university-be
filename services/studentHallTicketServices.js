import sequelize from "../database/sequelizeConfig.js";
import { getAcademicYearId } from "../utility/requestContext.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
import * as examinationSessionEligibilityRepo from "../repository/examinationSessionEligibilityRepository.js";
import * as examinationSessionEligibilityServices from "./examinationSessionEligibilityServices.js";

// -- Status helpers --

function resolveEligibilityStatus(storedStatus, dynamicStatus) {
  if (storedStatus === "BLOCKED") return "BLOCKED";
  if (storedStatus === "APPROVED") return "APPROVED";
  return dynamicStatus;
}

function mapStatusToFrontend(status) {
  if (status === "READY") return "Ready";
  if (status === "BLOCKED") return "Blocked";
  if (status === "APPROVED") return "Approved";
  return "Review";
}

function resolveHallTicketStatus(ticket, isBlocked) {
  if (isBlocked || ticket?.isBlocked) return "Blocked";
  if (ticket?.isPublished) return "Published";
  if (ticket) return "Generated";
  return "Not Generated";
}

// -- Review condition evaluation --

export function evaluateReviewConditions(reason = "", reviewReasons = null) {
  // Prefer structured reason codes when available.
  if (Array.isArray(reviewReasons) && reviewReasons.length > 0) {
    const codes = new Set(reviewReasons.map((r) => r.code));
    return {
      REGISTRATION_PENDING: codes.has("REGISTRATION_PENDING"),
      PHOTOGRAPH_PENDING: codes.has("MISSING_PHOTOGRAPH"),
      INVOICE_PENDING: codes.has("UNPAID_INVOICE"),
      FEE_PENDING: codes.has("UNPAID_INVOICE"),
      ATTENDANCE_PENDING:
        codes.has("LOW_ATTENDANCE") || codes.has("ATTENDANCE_DATA_INCOMPLETE"),
    };
  }

  // Fallback: legacy string-matching on reasonText.
  const r = (reason || "").toLowerCase();
  return {
    REGISTRATION_PENDING:
      r.includes("document") || r.includes("registration") || r.includes("incomplete"),
    PHOTOGRAPH_PENDING: r.includes("photograph") || r.includes("photo"),
    INVOICE_PENDING:
      r.includes("invoice") || r.includes("unpaid") || r.includes("fee") || r.includes("payment"),
    FEE_PENDING:
      r.includes("invoice") || r.includes("unpaid") || r.includes("fee") || r.includes("payment"),
    ATTENDANCE_PENDING: r.includes("attendance"),
  };
}

// -- Student row mapper --

function mapStudentRow(raw, dbStatus) {
  const student = raw.student;
  const hallTicket = student.hallTickets?.[0];
  const isGenerated = !!hallTicket;
  const isPublished = hallTicket?.isPublished ?? false;
  const isBlocked = dbStatus === "BLOCKED" ? true : (hallTicket?.isBlocked ?? false);
  const eligibilityRecord = student.examinationSessionEligibilities?.[0];

  return {
    studentId: student.studentId,
    enrollmentNumber: student.enrollNumber,
    firstName: student.firstName ?? null,
    middleName: student.middleName ?? null,
    lastName: student.lastName ?? null,
    courseId: student.courseId,
    courseName: student.course?.courseName,
    sessionId: raw.mapperSessionId,
    sessionName: student.studentSession?.sessionName,
    term: raw.classSectionTerm?.term ?? null,
    examinationSessionTermId: raw.examinationSessionTerm?.examinationSessionTermId ?? null,
    classSectionTermId: raw.classSectionTerm?.classSectionTermId ?? null,

    totalClasses: null,
    presentClasses: null,
    attendancePercentage: null,
    minimumAttendance: null,

    hallTicketId: hallTicket?.id ?? null,
    isGenerated,
    isPublished,
    isBlocked,
    markAsEligible: dbStatus === "APPROVED",
    hallTicketStatus: resolveHallTicketStatus(hallTicket, isBlocked),
    eligibilityStatus: mapStatusToFrontend(dbStatus),
    reasonText: eligibilityRecord?.reviewReason ?? null,
    eligibilityReason:
      dbStatus !== "READY" && dbStatus !== "APPROVED"
        ? (eligibilityRecord?.reviewReason ?? null)
        : null,
  };
}

function paginateList(list, page, limit) {
  const offset = (page - 1) * limit;
  const total = list.length;
  return {
    rows: list.slice(offset, offset + limit),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// -- Student list --

export async function getStudentsForExaminationSession(examinationSessionId, filters = {}) {
  const repoResult = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    filters,
  );

  const isPaginated = filters?.page != null || filters?.limit != null;
  const rawList = isPaginated ? repoResult.rows : repoResult;

  const dbStatusMap = await examinationSessionEligibilityRepo.getEligibilityStatusesMap(
    examinationSessionId,
  );

  const processed = rawList.map((raw) => {
    const student = raw.student;
    const studentId = student.studentId;
    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const dbStatus = eligibilityRecord?.status || dbStatusMap.get(studentId) || "REVIEW";
    return mapStudentRow(raw, dbStatus);
  });

  // Apply status filter in-service (frontend label array e.g. ["Ready","Review"]).
  const statusFilter = filters?.status;
  const filteredProcessed =
    statusFilter && statusFilter.length > 0
      ? processed.filter((row) => statusFilter.includes(row.eligibilityStatus))
      : processed;

  if (!isPaginated) return filteredProcessed;

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 10);
  return paginateList(filteredProcessed, page, limit);
}

// -- Eligibility overview counts --

export async function getHallTicketEligibilityOverview(examinationSessionId, filters = {}) {
  const repoResult = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    { courseId: filters.courseId, sessionId: filters.sessionId, term: filters.term },
  );

  const dbStatusMap = await examinationSessionEligibilityRepo.getEligibilityStatusesMap(
    examinationSessionId,
  );

  let ready = 0, blocked = 0, review = 0, approved = 0;
  let totalStudents = 0, generatedCount = 0, publishedCount = 0, readyAndApprovedNotGenerated = 0;
  const seenStudents = new Set();

  for (const raw of repoResult) {
    const student = raw.student;
    if (!student) continue;

    const studentId = student.studentId;
    if (seenStudents.has(studentId)) continue;
    seenStudents.add(studentId);

    totalStudents++;

    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const dbStatus = eligibilityRecord?.status || dbStatusMap.get(studentId) || "REVIEW";

    if (dbStatus === "READY") ready++;
    else if (dbStatus === "APPROVED") approved++;
    else if (dbStatus === "BLOCKED") blocked++;
    else review++;

    const hallTicket = student.hallTickets?.[0];
    if (hallTicket) {
      generatedCount++;
      if (hallTicket.isPublished) publishedCount++;
    } else if (dbStatus === "READY" || dbStatus === "APPROVED") {
      readyAndApprovedNotGenerated++;
    }
  }

  return { totalStudents, ready, approved, blocked, review, generatedCount, publishedCount, readyAndApprovedNotGenerated };
}

// -- Summary --

export async function getHallTicketSummary(examinationSessionId, filters = {}) {
  const { page, limit, ...queryFilters } = filters;
  const rawList = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    examinationSessionId,
    queryFilters,
  );

  let feeClearance = 0, attendanceShortage = 0, registrationPending = 0;
  let missingPhotograph = 0, approvedStudentCount = 0, totalStudents = 0;

  const termWiseMap = new Map();
  const courseSessionTermWiseMap = new Map();
  const seenStudents = new Set();

  const blankStat = () => ({
    totalStudents: 0,
    feeClearance: 0,
    attendanceShortage: 0,
    registrationPending: 0,
    missingPhotograph: 0,
    approvedStudentCount: 0,
  });

  for (const raw of rawList) {
    const student = raw.student;
    if (!student) continue;

    const studentId = student.studentId;
    if (seenStudents.has(studentId)) continue;
    seenStudents.add(studentId);

    totalStudents++;

    const term = raw.classSectionTerm?.term ?? "Unknown Term";
    const courseId = student.courseId ?? "Unknown Course";
    const sessionId = raw.mapperSessionId ?? "Unknown Session";
    const courseName = student.course?.courseName ?? "Unknown";
    const sessionName = student.studentSession?.sessionName ?? "Unknown";

    if (!termWiseMap.has(term)) termWiseMap.set(term, { term, ...blankStat() });

    const cstKey = `${courseId}_${sessionId}_${term}`;
    if (!courseSessionTermWiseMap.has(cstKey)) {
      courseSessionTermWiseMap.set(cstKey, { courseId, courseName, sessionId, sessionName, term, ...blankStat() });
    }

    const termObj = termWiseMap.get(term);
    const cstObj = courseSessionTermWiseMap.get(cstKey);

    termObj.totalStudents++;
    cstObj.totalStudents++;

    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const calculated = examinationSessionEligibilityServices.calculateStudentEligibility(raw);
    const status = eligibilityRecord?.status || (calculated.eligibilityStatus === "Ready" ? "READY" : (calculated.eligibilityStatus === "Blocked" ? "BLOCKED" : "REVIEW"));
    
    const conditions = evaluateReviewConditions(
      eligibilityRecord?.reviewReason || calculated.reasonText || "",
      calculated.reviewReasons
    );

    if (status === "APPROVED") {
      approvedStudentCount++;
      termObj.approvedStudentCount++;
      cstObj.approvedStudentCount++;
    }

    if (status !== "APPROVED" && status !== "READY") {
      if (conditions.ATTENDANCE_PENDING) { attendanceShortage++; termObj.attendanceShortage++; cstObj.attendanceShortage++; }
      if (conditions.REGISTRATION_PENDING) { registrationPending++; termObj.registrationPending++; cstObj.registrationPending++; }
      if (conditions.PHOTOGRAPH_PENDING) { missingPhotograph++; termObj.missingPhotograph++; cstObj.missingPhotograph++; }
      if (conditions.INVOICE_PENDING) { feeClearance++; termObj.feeClearance++; cstObj.feeClearance++; }
    }
  }

  const summary = { totalStudents, approvedStudentCount, feeClearance, attendanceShortage, registrationPending, missingPhotograph };

  if (filters.courseId && filters.term && filters.sessionId) return summary;

  return {
    ...summary,
    termWise: Array.from(termWiseMap.values()),
    courseSessionTermWise: Array.from(courseSessionTermWiseMap.values()),
  };
}

// -- Review filter --

export async function getStudentsByReviewReasons(examinationSessionId, filters = {}) {
  const repoResult = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    { courseId: filters.courseId, sessionId: filters.sessionId, term: filters.term },
  );

  const dbStatusMap = await examinationSessionEligibilityRepo.getEligibilityStatusesMap(
    examinationSessionId,
  );

  const filteredList = [];
  const seenStudents = new Set();

  for (const raw of repoResult) {
    const student = raw.student;
    if (!student) continue;
    const studentId = student.studentId;
    if (seenStudents.has(studentId)) continue;

    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const calculated = examinationSessionEligibilityServices.calculateStudentEligibility(raw);

    const dbStatus =
      eligibilityRecord?.status ||
      dbStatusMap.get(studentId) ||
      (calculated.eligibilityStatus === "Ready" ? "READY" : (calculated.eligibilityStatus === "Blocked" ? "BLOCKED" : "REVIEW"));

    // Only include REVIEW students.
    if (dbStatus !== "REVIEW") continue;

    const reason = eligibilityRecord?.reviewReason || calculated.reasonText || "";
    const conditions = evaluateReviewConditions(reason, calculated.reviewReasons);

    const matches =
      filters.filters && filters.filters.length > 0
        ? filters.filters.some((f) => conditions[f.toUpperCase()])
        : reason.length > 0;

    if (!matches) continue;

    seenStudents.add(studentId);
    filteredList.push({
      ...mapStudentRow(raw, dbStatus),
      reasonText: reason ?? null,
      eligibilityReason: reason ?? null,
    });
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 10);
  return paginateList(filteredList, page, limit);
}

// -- Detailed eligibility --

export async function getReviewDetails({ studentId, examinationSessionId }) {
  const list = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    { studentId: Number(studentId) },
  );
  const rawRecord = list[0] || null;

  if (!rawRecord) {
    const error = new Error("Student not found in this examination session");
    error.statusCode = 404;
    throw error;
  }

  if (Number(rawRecord?.student?.studentId) !== Number(studentId)) {
    const error = new Error("Fetched student does not match requested studentId");
    error.statusCode = 500;
    throw error;
  }

  const calculated = examinationSessionEligibilityServices.calculateStudentEligibility(rawRecord);
  const storedStatus = (await examinationSessionEligibilityRepo.getSingleEligibilityRecord(
    Number(examinationSessionId),
    Number(studentId),
  ))?.status || "REVIEW";

  const dynamicStatus = calculated.eligibilityStatus.toUpperCase();
  const resolvedStatus = resolveEligibilityStatus(storedStatus, dynamicStatus);
  const finalEligibilityStatus = mapStatusToFrontend(resolvedStatus);

  const hallTicketRecord = await studentHallTicketRepository.findHallTicketByStudentAndSession(
    Number(studentId),
    Number(examinationSessionId),
  );
  const isGenerated = !!hallTicketRecord;
  const isPublished = hallTicketRecord?.isPublished ?? false;
  const isBlocked = resolvedStatus === "BLOCKED" ? true : (hallTicketRecord?.isBlocked ?? false);

  return {
    eligibilityStatus: finalEligibilityStatus,
    hallTicketStatus: resolveHallTicketStatus(hallTicketRecord, isBlocked),
    hallTicketId: hallTicketRecord?.id ?? null,
    isGenerated,
    isPublished,
    isBlocked,
    markAsEligible: storedStatus === "APPROVED",
    student: calculated.student,
    examination: {
      examinationSessionId: Number(examinationSessionId),
      sessionName: rawRecord.examinationSession?.sessionName ?? null,
      assessmentTypeId: rawRecord.examinationSession?.assessmentTypeId ?? null,
      examSetupTypeTermId: calculated.academicContext.examSetupTypeTermId ?? null,
      examinationSessionTermId: calculated.academicContext.examinationSessionTermId,
    },
    attendance: calculated.attendance,
    regulation: calculated.regulation,
    reviewReasons: calculated.reviewReasons,
    overview: {
      eligibleNormally: finalEligibilityStatus === "Ready",
      requiresReview: finalEligibilityStatus === "Review",
      isBlocked: finalEligibilityStatus === "Blocked",
      canGenerateNormally: !isGenerated && ["Ready", "Review"].includes(finalEligibilityStatus),
      canGenerateWithOverride: !isGenerated && finalEligibilityStatus === "Review",
    },
  };
}

export async function getStudentEligibilityDetails(examinationSessionId, studentId) {
  const list = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    { studentId: Number(studentId) },
  );
  const rawRecord = list[0] || null;
  if (!rawRecord) {
    const error = new Error("Student not found in this examination session");
    error.statusCode = 404;
    throw error;
  }

  const calculated = examinationSessionEligibilityServices.calculateStudentEligibility(rawRecord);
  const dynamicStatus = calculated.eligibilityStatus.toUpperCase();

  const eligibilityRecord = await examinationSessionEligibilityRepo.getSingleEligibilityRecord(
    examinationSessionId,
    studentId,
  );
  if (!eligibilityRecord) {
    const error = new Error("Student eligibility record not found for this session");
    error.statusCode = 404;
    throw error;
  }

  const storedStatus = eligibilityRecord.status;
  const resolvedStatus = resolveEligibilityStatus(storedStatus, dynamicStatus);
  const finalEligibilityStatus = mapStatusToFrontend(resolvedStatus);

  const hallTicketRecord = await studentHallTicketRepository.findHallTicketByStudentAndSession(
    studentId,
    examinationSessionId,
  );

  return {
    ...calculated.student,
    ...calculated.attendance,
    storedStatus,
    dynamicStatus,
    eligibilityStatus: finalEligibilityStatus,
    eligibilityReason:
      resolvedStatus !== "READY" && resolvedStatus !== "APPROVED"
        ? calculated.reasonText || null
        : null,
    isGenerated: Boolean(hallTicketRecord),
    isPublished: hallTicketRecord?.isPublished ?? false,
    isBlocked: hallTicketRecord?.isBlocked ?? false,
    markAsEligible: storedStatus === "APPROVED",
    hallTicketStatus: resolveHallTicketStatus(hallTicketRecord, resolvedStatus === "BLOCKED"),
    hallTicketId: hallTicketRecord?.id ?? null,
    canGenerateHallTicket: resolvedStatus === "READY" || resolvedStatus === "APPROVED",
  };
}

// -- Hall ticket generation --

async function buildGenerationReadiness({ examinationSessionId, transaction }) {
  const examinationSession = await studentHallTicketRepository.findExaminationSessionById(
    examinationSessionId,
    transaction,
  );
  if (!examinationSession) {
    const error = new Error("Examination Session not found");
    error.statusCode = 404;
    throw error;
  }

  const schedules = await studentHallTicketRepository.getSchedulesByExaminationSessionId(
    examinationSessionId,
    transaction,
  );

  return {
    examinationSession,
    totalSchedules: schedules.length,
    canGenerate: schedules.some((s) => s.examDate && s.examTime),
  };
}

export async function generateHallTickets({ examinationSessionId, studentIds, user }) {
  return await sequelize.transaction(async (transaction) => {
    const readiness = await buildGenerationReadiness({ examinationSessionId, transaction });

    if (!readiness.canGenerate) {
      const error = new Error(
        "Schedule at least one subject with exam date and time for this examination session before generating hall tickets.",
      );
      error.statusCode = 400;
      throw error;
    }

    const effectiveAcademicYearId =
      getAcademicYearId() ||
      (user?.academicYearId ? Number(user.academicYearId) : undefined) ||
      readiness.examinationSession.academicYearId;

    const eligibleStudentIds = await examinationSessionEligibilityRepo.getEligibleStudentIdsForGeneration(
      examinationSessionId,
      studentIds,
      { transaction },
    );

    if (!eligibleStudentIds.length) return { generatedCount: 0, hallTickets: [] };

    const generatedTickets = [];
    for (const targetStudentId of eligibleStudentIds) {
      const ticket = await studentHallTicketRepository.generateOrRegenerateStudentHallTicket(
        { examinationSessionId, academicYearId: effectiveAcademicYearId, studentId: targetStudentId },
        transaction,
      );
      generatedTickets.push(ticket);
    }

    return {
      generatedCount: generatedTickets.length,
      assessmentType: readiness.examinationSession.assessmentType,
      hallTickets: generatedTickets,
    };
  });
}

// -- Mark as eligible --

export async function markAsEligible({ examinationSessionId, studentIds, user }) {
  return await sequelize.transaction(async (transaction) => {
    const requestedCount = studentIds.length;
    const approvedCount = await examinationSessionEligibilityRepo.bulkApproveEligibility(
      examinationSessionId,
      studentIds,
      user?.userId || user?.id,
      { transaction },
    );

    return {
      requestedCount,
      approvedCount,
      skippedCount: requestedCount - approvedCount,
    };
  });
}

// -- Publishing and blocking --

export async function publishHallTickets({ examinationSessionId, studentIds }) {
  return await sequelize.transaction(async (transaction) => {
    const allSessionStudents = await studentHallTicketRepository.getStudentsByExaminationSessionId(
      examinationSessionId,
      {},
      transaction,
    );
    const validStudentIds = new Set(allSessionStudents.map((s) => s.student.studentId));

    let targets = null;
    if (studentIds && studentIds.length > 0) {
      for (const sid of studentIds) {
        if (!validStudentIds.has(sid)) {
          const error = new Error(
            `Student ${sid} is not associated with examination session ${examinationSessionId}`,
          );
          error.statusCode = 400;
          throw error;
        }
      }
      targets = studentIds;
    }

    const generatedCount = await studentHallTicketRepository.countHallTickets(
      { examinationSessionId, ...(targets && { studentId: targets }) },
      transaction,
    );

    if (generatedCount === 0) {
      const error = new Error(
        targets && targets.length > 0
          ? "No generated hall tickets found for the specified student(s). Please generate them first."
          : "No generated hall tickets found for this examination session. Please generate them first.",
      );
      error.statusCode = 400;
      throw error;
    }

    const publishedCount = await studentHallTicketRepository.publishHallTickets(
      examinationSessionId,
      targets,
      transaction,
    );
    return { examinationSessionId, publishedCount };
  });
}

export async function blockHallTicket(id) {
  return await sequelize.transaction(async (transaction) => {
    const ticket = await studentHallTicketRepository.blockHallTicket(id, transaction);
    if (!ticket) {
      const error = new Error("Hall ticket not found");
      error.statusCode = 404;
      throw error;
    }
    return ticket;
  });
}

// -- Hall ticket detail helpers --

function resolveScheduleTerm(plain) {
  if (plain.term != null) return Number(plain.term);
  if (plain.subjectSchedule?.term != null) return Number(plain.subjectSchedule.term);
  return null;
}

function schedulesToSubjectList(scheduleRows, mappedScheduleIds = [], roomSeatingMap = new Map()) {
  const mappedSet = new Set(mappedScheduleIds || []);
  return (scheduleRows || []).map((row) => {
    const plain = row.get ? row.get({ plain: true }) : row;
    const sub = plain.subjectSchedule;
    const seatInfo = roomSeatingMap.get(plain.examScheduleId);
    
    let seatNumber = "";
    if (seatInfo && seatInfo.row && seatInfo.column) {
      const rowChar = String.fromCharCode(64 + Number(seatInfo.row));
      seatNumber = `${rowChar}${seatInfo.column}`;
    }

    return {
      examScheduleId: plain.examScheduleId,
      isMapped: plain.examScheduleId != null && mappedSet.has(plain.examScheduleId),
      subjectId: sub?.subjectId ?? plain.subjectId ?? null,
      subjectName: sub?.subjectName ?? null,
      subjectCode: sub?.subjectCode ?? null,
      term: resolveScheduleTerm(plain),
      examDate: plain.examDate ?? null,
      examTime: plain.examTime ?? null,
      duration: plain.duration ?? null,
      scheduleKind: plain.type ?? null,
      slot: plain.examinationSessionSlot ?? null,
      subject: sub ?? null,
      seating: seatInfo ? {
        row: seatInfo.row,
        column: seatInfo.column,
        seatNumber,
        roomNumber: seatInfo.roomNumber,
      } : null,
    };
  });
}

function flattenHallTicketDetail(ticket, scheduleRows, mappedScheduleIds = [], roomSeatingMap = new Map()) {
  const st = ticket.student;
  const es = ticket.examinationSession;
  const assessmentType = es?.assessmentType;
  const academicYear = ticket.academicYear || es?.academicYear;

  return {
    id: ticket.id,
    qr: ticket.qr,
    examinationSessionId: ticket.examinationSessionId,
    academicYearId: ticket.academicYearId,
    studentId: ticket.studentId,
    instituteId: ticket.instituteId,
    universityId: ticket.universityId,
    isBlocked: ticket.isBlocked ?? false,
    isPublished: ticket.isPublished ?? false,
    publishedAt: ticket.publishedAt ?? null,
    blockedAt: ticket.blockedAt ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    studentFirstName: st?.firstName ?? null,
    studentMiddleName: st?.middleName ?? null,
    studentLastName: st?.lastName ?? null,
    scholarNumber: st?.scholarNumber ?? null,
    enrollNumber: st?.enrollNumber ?? null,
    sessionName: es?.sessionName ?? null,
    academicYearTitle: academicYear?.yearTitle ?? null,
    assessmentTypeId: es?.assessmentTypeId ?? null,
    examType: assessmentType?.examCategory ?? null,
    examName: assessmentType?.examName ?? null,
    subjects: schedulesToSubjectList(scheduleRows, mappedScheduleIds, roomSeatingMap),
  };
}

async function fetchHallTicketWithSchedules(ticket, transaction) {
  const student = ticket.student;
  const term = student?.studentClassSectionTerm?.term;
  const courseId = student?.courseId;
  const sessionId = student?.sessionId;

  if (!student || term == null || courseId == null || sessionId == null) {
    return flattenHallTicketDetail(ticket, [], [], new Map());
  }

  const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
    ticket.examinationSessionId,
    { courseId, sessionId, term },
    transaction,
  );

  const examScheduleIds = schedules.map((s) => s.examScheduleId).filter((id) => id != null);

  const [mappedScheduleIds, roomSeatingMap] = await Promise.all([
    studentHallTicketRepository.getMappedExamScheduleIds(ticket.studentId, examScheduleIds, transaction),
    studentHallTicketRepository.getStudentRoomSeatingDetails(ticket.studentId, examScheduleIds, transaction),
  ]);

  return flattenHallTicketDetail(ticket, schedules, mappedScheduleIds, roomSeatingMap);
}

// -- Hall ticket detail / QR --

export async function getHallTicketById(id) {
  return await sequelize.transaction(async (transaction) => {
    const ticket = await studentHallTicketRepository.getHallTicketById(id, transaction);
    if (!ticket) return null;
    return fetchHallTicketWithSchedules(ticket, transaction);
  });
}

export async function getHallTicketDetailsByQr(qr) {
  return await sequelize.transaction(async (transaction) => {
    const ticket = await studentHallTicketRepository.getHallTicketByQr(qr, transaction);
    if (!ticket) return null;
    return fetchHallTicketWithSchedules(ticket, transaction);
  });
}

// -- Hall ticket list --

export async function getAllHallTickets(filters, pagination = {}) {
  const page = pagination.page ?? 1;
  const rawLimit = pagination.limit ?? 1000;
  const limit = Math.min(1000, Math.max(10, rawLimit));
  const offset = (page - 1) * limit;

  return await sequelize.transaction(async (transaction) => {
    const [rows, total] = await Promise.all([
      studentHallTicketRepository.getAllHallTickets(filters, transaction, { limit, offset }),
      studentHallTicketRepository.countHallTickets(filters, transaction),
    ]);
    return { rows, total, page, limit };
  });
}

export async function getAllHallTicketsForUser(query = {}, user) {
  const filters = {};
  if (query.examinationSessionId) filters.examinationSessionId = query.examinationSessionId;
  const academicYearId =
    query.academicYearId ||
    getAcademicYearId() ||
    (user?.academicYearId ? Number(user.academicYearId) : undefined);
  if (academicYearId) filters.academicYearId = academicYearId;
  if (query.studentId) filters.studentId = query.studentId;

  return getAllHallTickets(filters, { page: query.page, limit: query.limit });
}
