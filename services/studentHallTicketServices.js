import crypto from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import { buildTermName } from "../utility/courseTerms.js";
import { getAcademicYearId } from "../utility/requestContext.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
import { getUserPermissions } from "../utility/authEngine.js";
import { PERMISSIONS } from "../const/permissions.js";
import * as examinationSessionEligibilityRepo from "../repository/examinationSessionEligibilityRepository.js";
import * as examinationSessionEligibilityServices from "./examinationSessionEligibilityServices.js";

function resolveEligibilityStatus(storedStatus, dynamicStatus) {
  if (storedStatus === "BLOCKED") return "BLOCKED";
  if (storedStatus === "APPROVED") return "APPROVED";
  return dynamicStatus; // READY or REVIEW
}

function mapStatusToFrontend(status) {
  if (status === "READY") return "Ready";
  if (status === "BLOCKED") return "Blocked";
  if (status === "APPROVED") return "Approved";
  return "Review";
}

export async function getStudentsForExaminationSession(
  examinationSessionId,
  filters = {},
) {
  const repoResult =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
      Number(examinationSessionId),
      filters,
    );

  const isPaginated = filters?.page != null || filters?.limit != null;
  const rawList = isPaginated ? repoResult.rows : repoResult;

  // Fetch existing status map from database
  const dbStatusMap =
    await examinationSessionEligibilityRepo.getEligibilityStatusesMap(
      examinationSessionId,
    );

  const processed = rawList.map((raw) => {
    const student = raw.student;
    const studentId = student.studentId;

    // Persisted status directly from database
    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const dbStatus =
      eligibilityRecord?.status || dbStatusMap.get(studentId) || "REVIEW";
    const finalStatus = mapStatusToFrontend(dbStatus);

    // Hall Ticket info
    const hallTicket = student.hallTickets?.[0];
    const isGenerated = !!hallTicket;
    const isPublished = hallTicket?.isPublished ?? false;
    const isBlocked =
      dbStatus === "BLOCKED" ? true : (hallTicket?.isBlocked ?? false);
    const hallTicketStatus = hallTicket?.isBlocked
      ? "Blocked"
      : hallTicket?.isPublished
        ? "Published"
        : isGenerated
          ? "Generated"
          : "Not Generated";

    return {
      studentId: studentId,
      enrollmentNumber: student.enrollNumber,
      firstName: student.firstName ?? null,
      middleName: student.middleName ?? null,
      lastName: student.lastName ?? null,
      courseId: student.courseId,
      courseName: student.course?.courseName,
      sessionId: raw.mapperSessionId,
      sessionName: student.studentSession?.sessionName,
      term: raw.classSectionTerm?.term ?? null,
      examinationSessionTermId:
        raw.examinationSessionTerm?.examinationSessionTermId ?? null,
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
      hallTicketStatus,
      eligibilityStatus: finalStatus,
      reasonText: eligibilityRecord?.reviewReason ?? null,

      eligibilityReason:
        dbStatus !== "READY" && dbStatus !== "APPROVED"
          ? (eligibilityRecord?.reviewReason ?? null)
          : null,
    };
  });

  // Apply status filter in-service (status is a frontend-facing label array e.g. ["Ready","Review"])
  const statusFilter = filters?.status;
  const filteredProcessed =
    statusFilter && statusFilter.length > 0
      ? processed.filter((row) => statusFilter.includes(row.eligibilityStatus))
      : processed;

  if (!isPaginated) {
    return filteredProcessed;
  }

  // Re-paginate from the filtered list so totals are accurate
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 10);
  const offset = (page - 1) * limit;
  const paginatedRows = filteredProcessed.slice(offset, offset + limit);
  const total = filteredProcessed.length;

  return {
    rows: paginatedRows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getHallTicketEligibilityOverview(
  examinationSessionId,
  filters = {},
) {
  const repoResult =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
      Number(examinationSessionId),
      {
        courseId: filters.courseId,
        sessionId: filters.sessionId,
        term: filters.term,
      },
    );

  const dbStatusMap =
    await examinationSessionEligibilityRepo.getEligibilityStatusesMap(
      examinationSessionId,
    );

  let ready = 0;
  let blocked = 0;
  let review = 0;
  let approved = 0;
  let totalStudents = 0;
  let generatedCount = 0;
  let publishedCount = 0;
  let readyAndApprovedNotGenerated = 0;

  const seenStudents = new Set();

  for (const raw of repoResult) {
    const student = raw.student;
    if (!student) continue;

    const studentId = student.studentId;
    if (seenStudents.has(studentId)) continue;
    seenStudents.add(studentId);

    totalStudents++;

    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const dbStatus =
      eligibilityRecord?.status || dbStatusMap.get(studentId) || "REVIEW";

    if (dbStatus === "READY") ready++;
    else if (dbStatus === "APPROVED") approved++;
    else if (dbStatus === "BLOCKED") blocked++;
    else if (dbStatus === "REVIEW") review++;

    const hallTicket = student.hallTickets?.[0];
    if (hallTicket) {
      generatedCount++;
      if (hallTicket.isPublished) {
        publishedCount++;
      }
    } else {
      // No hall ticket generated
      if (dbStatus === "READY" || dbStatus === "APPROVED") {
        readyAndApprovedNotGenerated++;
      }
    }
  }

  return {
    totalStudents,
    ready,
    approved,
    blocked,
    review,
    generatedCount,
    publishedCount,
    readyAndApprovedNotGenerated,
  };
}

export function evaluateReviewConditions(reason = "", reviewReasons = null) {
  // Prefer structured reason codes when available
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

  // Fallback: legacy string-matching on reasonText
  const lowerReason = (reason || "").toLowerCase();
  return {
    // "Required registration document has not been submitted." / "Registration document verification is pending." / "incomplete registration"
    REGISTRATION_PENDING:
      lowerReason.includes("document") ||
      lowerReason.includes("registration") ||
      lowerReason.includes("incomplete"),
    // "Student photograph is missing."
    PHOTOGRAPH_PENDING:
      lowerReason.includes("photograph") || lowerReason.includes("photo"),
    // "Student has X unpaid invoices with an outstanding amount of ..."
    INVOICE_PENDING:
      lowerReason.includes("invoice") ||
      lowerReason.includes("unpaid") ||
      lowerReason.includes("fee") ||
      lowerReason.includes("payment"),
    FEE_PENDING:
      lowerReason.includes("invoice") ||
      lowerReason.includes("unpaid") ||
      lowerReason.includes("fee") ||
      lowerReason.includes("payment"),
    // "Attendance is X%..." / "Attendance data is incomplete..."
    ATTENDANCE_PENDING: lowerReason.includes("attendance"),
  };
}

export async function getHallTicketSummary(examinationSessionId, filters = {}) {
  const { page, limit, ...queryFilters } = filters;
  const rawList =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
      examinationSessionId,
      queryFilters,
    );

  let feeClearance = 0;
  let attendanceShortage = 0;
  let registrationPending = 0;
  let missingPhotograph = 0;
  let approvedStudentCount = 0;
  let totalStudents = 0;

  const termWiseMap = new Map();
  const courseSessionTermWiseMap = new Map();
  const seenStudents = new Set();

  const getStatObj = () => ({
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

    const termKey = term;
    const cstKey = `${courseId}_${sessionId}_${term}`;

    if (!termWiseMap.has(termKey)) {
      termWiseMap.set(termKey, { term, ...getStatObj() });
    }
    if (!courseSessionTermWiseMap.has(cstKey)) {
      courseSessionTermWiseMap.set(cstKey, {
        courseId,
        courseName,
        sessionId,
        sessionName,
        term,
        ...getStatObj(),
      });
    }

    const termObj = termWiseMap.get(termKey);
    const cstObj = courseSessionTermWiseMap.get(cstKey);

    termObj.totalStudents++;
    cstObj.totalStudents++;

    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const reason = eligibilityRecord?.reviewReason || "";
    const conditions = evaluateReviewConditions(reason);

    const status = eligibilityRecord?.status || "REVIEW";
    if (status === "APPROVED") {
      approvedStudentCount++;
      termObj.approvedStudentCount++;
      cstObj.approvedStudentCount++;
    }

    // Only count failure reasons/pending checks if student status is REVIEW (not APPROVED or READY)
    if (status !== "APPROVED" && status !== "READY") {
      if (conditions.ATTENDANCE_PENDING) {
        attendanceShortage++;
        termObj.attendanceShortage++;
        cstObj.attendanceShortage++;
      }
      if (conditions.REGISTRATION_PENDING) {
        registrationPending++;
        termObj.registrationPending++;
        cstObj.registrationPending++;
      }
      if (conditions.PHOTOGRAPH_PENDING) {
        missingPhotograph++;
        termObj.missingPhotograph++;
        cstObj.missingPhotograph++;
      }
      if (conditions.INVOICE_PENDING) {
        feeClearance++;
        termObj.feeClearance++;
        cstObj.feeClearance++;
      }
    }
  }

  if (filters.courseId && filters.term && filters.sessionId) {
    return {
      totalStudents,
      approvedStudentCount,
      feeClearance,
      attendanceShortage,
      registrationPending,
      missingPhotograph,
    };
  }

  return {
    totalStudents,
    approvedStudentCount,
    feeClearance,
    attendanceShortage,
    registrationPending,
    missingPhotograph,
    termWise: Array.from(termWiseMap.values()),
    courseSessionTermWise: Array.from(courseSessionTermWiseMap.values()),
  };
}

async function buildGenerationReadiness({ examinationSessionId, transaction }) {
  const examinationSession =
    await studentHallTicketRepository.findExaminationSessionById(
      examinationSessionId,
      transaction,
    );
  if (!examinationSession) {
    const error = new Error("Examination Session not found");
    error.statusCode = 404;
    throw error;
  }

  const schedules =
    await studentHallTicketRepository.getSchedulesByExaminationSessionId(
      examinationSessionId,
      transaction,
    );
  const canGenerate = schedules.some((s) => s.examDate && s.examTime);

  return {
    examinationSession,
    totalSchedules: schedules.length,
    canGenerate,
  };
}

export async function generateHallTickets({
  examinationSessionId,
  studentIds,
  user,
}) {
  return await sequelize.transaction(async (transaction) => {
    const readiness = await buildGenerationReadiness({
      examinationSessionId,
      transaction,
    });

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

    // Fetch eligible student Ids (READY or APPROVED) directly from examinationSessionEligibilityModel
    const eligibleStudentIds =
      await examinationSessionEligibilityRepo.getEligibleStudentIdsForGeneration(
        examinationSessionId,
        studentIds,
        { transaction },
      );

    if (!eligibleStudentIds.length) {
      return { generatedCount: 0, hallTickets: [] };
    }

    const generatedTickets = [];
    for (const targetStudentId of eligibleStudentIds) {
      const ticket =
        await studentHallTicketRepository.generateOrRegenerateStudentHallTicket(
          {
            examinationSessionId,
            academicYearId: effectiveAcademicYearId,
            studentId: targetStudentId,
          },
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

export async function getReviewDetails({ studentId, examinationSessionId }) {
  const list =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
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
    const error = new Error(
      "Fetched student does not match requested studentId",
    );
    error.statusCode = 500;
    throw error;
  }

  const calculated =
    examinationSessionEligibilityServices.calculateStudentEligibility(
      rawRecord,
    );

  const eligibilityRecord =
    await examinationSessionEligibilityRepo.getSingleEligibilityRecord(
      Number(examinationSessionId),
      Number(studentId),
    );
  const storedStatus = eligibilityRecord?.status || "REVIEW";
  const dynamicStatus = calculated.eligibilityStatus.toUpperCase();
  const resolvedStatus = resolveEligibilityStatus(storedStatus, dynamicStatus);
  const finalEligibilityStatus = mapStatusToFrontend(resolvedStatus);

  const hallTicketRecord =
    await studentHallTicketRepository.findHallTicketByStudentAndSession(
      Number(studentId),
      Number(examinationSessionId),
    );
  const isGenerated = !!hallTicketRecord;
  const isPublished = hallTicketRecord?.isPublished ?? false;
  const isBlocked =
    resolvedStatus === "BLOCKED"
      ? true
      : (hallTicketRecord?.isBlocked ?? false);
  const hallTicketStatus = isBlocked
    ? "Blocked"
    : isPublished
      ? "Published"
      : isGenerated
        ? "Generated"
        : "Not Generated";

  const overview = {
    eligibleNormally: finalEligibilityStatus === "Ready",
    requiresReview: finalEligibilityStatus === "Review",
    isBlocked: finalEligibilityStatus === "Blocked",
    canGenerateNormally:
      !isGenerated && ["Ready", "Review"].includes(finalEligibilityStatus),
    canGenerateWithOverride:
      !isGenerated && finalEligibilityStatus === "Review",
  };

  return {
    eligibilityStatus: finalEligibilityStatus,
    hallTicketStatus,

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
      examSetupTypeTermId:
        calculated.academicContext.examSetupTypeTermId ?? null,
      examinationSessionTermId:
        calculated.academicContext.examinationSessionTermId,
    },

    attendance: calculated.attendance,

    regulation: calculated.regulation,

    reviewReasons: calculated.reviewReasons,

    overview,
  };
}

function resolveScheduleTerm(plain) {
  if (plain.term != null) return Number(plain.term);
  if (plain.subjectSchedule?.term != null)
    return Number(plain.subjectSchedule.term);
  return null;
}

function schedulesToSubjectList(
  scheduleRows,
  mappedScheduleIds = [],
  roomSeatingMap = new Map(),
) {
  const mappedSet = new Set(mappedScheduleIds || []);

  return (scheduleRows || []).map((row) => {
    const plain = row.get ? row.get({ plain: true }) : row;
    const sub = plain.subjectSchedule;
    const slot = plain.examinationSessionSlot;
    const term = resolveScheduleTerm(plain);
    const isMapped =
      plain.examScheduleId != null && mappedSet.has(plain.examScheduleId);
    const seating = roomSeatingMap.get(plain.examScheduleId) || null;
    return {
      examScheduleId: plain.examScheduleId,
      isMapped,
      subjectId: sub?.subjectId ?? plain.subjectId ?? null,
      subjectName: sub?.subjectName ?? null,
      subjectCode: sub?.subjectCode ?? null,
      term,
      examDate: plain.examDate ?? null,
      examTime: plain.examTime ?? null,
      duration: plain.duration ?? null,
      scheduleKind: plain.type ?? null,
      slot: slot ?? null,
      subject: sub ?? null,
      seating,
    };
  });
}

function flattenHallTicketDetail(
  ticket,
  scheduleRows,
  mappedScheduleIds = [],
  roomSeatingMap = new Map(),
) {
  const st = ticket.student;
  const es = ticket.examinationSession;
  const assessmentType = es?.assessmentType;
  const academicYear = ticket.academicYear || es?.academicYear;
  const subjects = schedulesToSubjectList(
    scheduleRows,
    mappedScheduleIds,
    roomSeatingMap,
  );

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
    subjects,
  };
}

export async function getHallTicketById(id) {
  return await sequelize.transaction(async (transaction) => {
    const ticket = await studentHallTicketRepository.getHallTicketById(
      id,
      transaction,
    );
    if (!ticket) return null;

    const student = ticket.student;
    const term = student?.studentClassSectionTerm?.term;
    const courseId = student?.courseId;
    const sessionId = student?.sessionId;

    if (!student || term == null || courseId == null || sessionId == null) {
      return flattenHallTicketDetail(ticket, [], [], new Map());
    }

    const schedules =
      await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
        ticket.examinationSessionId,
        { courseId, sessionId, term },
        transaction,
      );

    const examScheduleIds = schedules
      .map((s) => s.examScheduleId)
      .filter((examScheduleId) => examScheduleId != null);
    const mappedScheduleIds =
      await studentHallTicketRepository.getMappedExamScheduleIds(
        ticket.studentId,
        examScheduleIds,
        transaction,
      );

    const roomSeatingMap =
      await studentHallTicketRepository.getStudentRoomSeatingDetails(
        ticket.studentId,
        examScheduleIds,
        transaction,
      );

    return flattenHallTicketDetail(
      ticket,
      schedules,
      mappedScheduleIds,
      roomSeatingMap,
    );
  });
}

export async function getHallTicketDetailsByQr(qr) {
  return await sequelize.transaction(async (transaction) => {
    const ticket = await studentHallTicketRepository.getHallTicketByQr(
      qr,
      transaction,
    );
    if (!ticket) return null;

    const student = ticket.student;
    const term = student?.studentClassSectionTerm?.term;
    const courseId = student?.courseId;
    const sessionId = student?.sessionId;

    if (!student || term == null || courseId == null || sessionId == null) {
      return flattenHallTicketDetail(ticket, [], [], new Map());
    }

    const schedules =
      await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
        ticket.examinationSessionId,
        { courseId, sessionId, term },
        transaction,
      );

    const examScheduleIds = schedules
      .map((s) => s.examScheduleId)
      .filter((examScheduleId) => examScheduleId != null);
    const mappedScheduleIds =
      await studentHallTicketRepository.getMappedExamScheduleIds(
        ticket.studentId,
        examScheduleIds,
        transaction,
      );

    const roomSeatingMap =
      await studentHallTicketRepository.getStudentRoomSeatingDetails(
        ticket.studentId,
        examScheduleIds,
        transaction,
      );

    return flattenHallTicketDetail(
      ticket,
      schedules,
      mappedScheduleIds,
      roomSeatingMap,
    );
  });
}

export async function getAllHallTickets(filters, pagination = {}) {
  const page = pagination.page ?? 1;
  const rawLimit = pagination.limit ?? 1000;
  const limit = Math.min(1000, Math.max(10, rawLimit));
  const offset = (page - 1) * limit;

  return await sequelize.transaction(async (transaction) => {
    const [rows, total] = await Promise.all([
      studentHallTicketRepository.getAllHallTickets(filters, transaction, {
        limit,
        offset,
      }),
      studentHallTicketRepository.countHallTickets(filters, transaction),
    ]);
    return { rows, total, page, limit };
  });
}

export async function getAllHallTicketsForUser(query = {}, user) {
  const filters = {};
  if (query.examinationSessionId)
    filters.examinationSessionId = query.examinationSessionId;
  const academicYearId =
    query.academicYearId ||
    getAcademicYearId() ||
    (user?.academicYearId ? Number(user.academicYearId) : undefined);
  if (academicYearId) filters.academicYearId = academicYearId;
  if (query.studentId) filters.studentId = query.studentId;

  return getAllHallTickets(filters, {
    page: query.page,
    limit: query.limit,
  });
}

export async function blockHallTicket(id) {
  return await sequelize.transaction(async (transaction) => {
    const ticket = await studentHallTicketRepository.blockHallTicket(
      id,
      transaction,
    );
    if (!ticket) {
      const error = new Error("Hall ticket not found");
      error.statusCode = 404;
      throw error;
    }
    return ticket;
  });
}

export async function publishHallTickets({ examinationSessionId, studentIds }) {
  return await sequelize.transaction(async (transaction) => {
    const allSessionStudents =
      await studentHallTicketRepository.getStudentsByExaminationSessionId(
        examinationSessionId,
        {},
        transaction,
      );
    const validStudentIds = new Set(
      allSessionStudents.map((s) => s.student.studentId),
    );

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
      {
        examinationSessionId,
        ...(targets && { studentId: targets }),
      },
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
export async function getStudentEligibilityDetails(
  examinationSessionId,
  studentId,
) {
  const list =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
      Number(examinationSessionId),
      { studentId: Number(studentId) },
    );
  const rawRecord = list[0] || null;
  if (!rawRecord) {
    const error = new Error("Student not found in this examination session");
    error.statusCode = 404;
    throw error;
  }

  // 2. Calculate Dynamic Eligibility
  const calculated =
    examinationSessionEligibilityServices.calculateStudentEligibility(
      rawRecord,
    );
  const dynamicStatus = calculated.eligibilityStatus.toUpperCase(); // 'READY', 'REVIEW', 'BLOCKED'

  // 3. Fetch Stored Eligibility (Do NOT create if missing here)
  const eligibilityRecord =
    await examinationSessionEligibilityRepo.getSingleEligibilityRecord(
      examinationSessionId,
      studentId,
    );
  if (!eligibilityRecord) {
    const error = new Error(
      "Student eligibility record not found for this session",
    );
    error.statusCode = 404;
    throw error;
  }

  const storedStatus = eligibilityRecord.status;

  // 4. Resolve Final Status (BLOCKED > APPROVED > Dynamic)
  const resolvedStatus = resolveEligibilityStatus(storedStatus, dynamicStatus);
  const finalEligibilityStatus = mapStatusToFrontend(resolvedStatus);

  // 5. Query Hall Ticket Existence efficiently
  const hallTicketRecord =
    await studentHallTicketRepository.findHallTicketByStudentAndSession(
      studentId,
      examinationSessionId,
    );

  // Assemble payload matching existing frontend expectations
  return {
    ...calculated.student,
    ...calculated.attendance,

    storedStatus: storedStatus,
    dynamicStatus: dynamicStatus,
    eligibilityStatus: finalEligibilityStatus,
    eligibilityReason:
      resolvedStatus !== "READY" && resolvedStatus !== "APPROVED"
        ? calculated.reasonText || null
        : null,

    isGenerated: Boolean(hallTicketRecord),
    isPublished: hallTicketRecord?.isPublished ?? false,
    isBlocked: hallTicketRecord?.isBlocked ?? false,
    markAsEligible: storedStatus === "APPROVED",
    hallTicketStatus: hallTicketRecord?.isBlocked
      ? "Blocked"
      : hallTicketRecord?.isPublished
        ? "Published"
        : hallTicketRecord
          ? "Generated"
          : "Not Generated",
    hallTicketId: hallTicketRecord?.id ?? null,

    canGenerateHallTicket:
      resolvedStatus === "READY" || resolvedStatus === "APPROVED",
  };
}

/**
 * Bulk approves student's hall ticket eligibility for an examination session.
 * Only targets students currently in "REVIEW" status.
 */
export async function markAsEligible({
  examinationSessionId,
  studentIds,
  user,
}) {
  return await sequelize.transaction(async (transaction) => {
    const requestedCount = studentIds.length;
    const approvedCount =
      await examinationSessionEligibilityRepo.bulkApproveEligibility(
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

export async function getStudentsByReviewReasons(
  examinationSessionId,
  filters = {},
) {
  // 1. Fetch all matching students in cohort (without page/limit)
  const repoResult =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
      Number(examinationSessionId),
      {
        courseId: filters.courseId,
        sessionId: filters.sessionId,
        term: filters.term,
      },
    );

  // Fetch existing status map from database
  const dbStatusMap =
    await examinationSessionEligibilityRepo.getEligibilityStatusesMap(
      examinationSessionId,
    );

  // 2. Filter students by matching the stored review reason patterns
  const filteredList = [];
  const seenStudents = new Set();

  for (const raw of repoResult) {
    const student = raw.student;
    const studentId = student.studentId;

    // Ensure distinct student processing
    if (seenStudents.has(studentId)) continue;

    const dbStatus =
      student.examinationSessionEligibilities?.[0]?.status ||
      dbStatusMap.get(studentId) ||
      "REVIEW";

    // We only care about students in REVIEW status (which is what summary cards count)
    if (dbStatus !== "REVIEW") {
      continue;
    }

    const eligibilityRecord = student.examinationSessionEligibilities?.[0];
    const reason = eligibilityRecord?.reviewReason || "";
    const conditions = evaluateReviewConditions(reason);

    // Determine if student matches requested filters (OR semantics)
    let matches = false;
    if (filters && filters.filters && filters.filters.length > 0) {
      matches = filters.filters.some((f) => conditions[f.toUpperCase()]);
    } else {
      // No specific filters => any reason qualifies
      matches = reason.length > 0;
    }

    if (matches) {
      seenStudents.add(studentId); // Mark as added to filteredList
      const finalStatus = mapStatusToFrontend(dbStatus);
      const hallTicket = student.hallTickets?.[0];
      const isGenerated = !!hallTicket;
      const isPublished = hallTicket?.isPublished ?? false;
      const isBlocked =
        dbStatus === "BLOCKED" ? true : (hallTicket?.isBlocked ?? false);
      const hallTicketStatus = hallTicket?.isBlocked
        ? "Blocked"
        : hallTicket?.isPublished
          ? "Published"
          : isGenerated
            ? "Generated"
            : "Not Generated";

      filteredList.push({
        studentId: studentId,
        enrollmentNumber: student.enrollNumber,
        firstName: student.firstName ?? null,
        middleName: student.middleName ?? null,
        lastName: student.lastName ?? null,
        courseId: student.courseId,
        courseName: student.course?.courseName,
        sessionId: raw.mapperSessionId,
        sessionName: student.studentSession?.sessionName,
        term: raw.classSectionTerm?.term ?? null,
        examinationSessionTermId:
          raw.examinationSessionTerm?.examinationSessionTermId ?? null,
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
        hallTicketStatus,
        eligibilityStatus: finalStatus,
        reasonText: reason ?? null,
        eligibilityReason: reason ?? null,
      });
    }
  }

  // 3. Paginate the filtered list
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 10);
  const offset = (page - 1) * limit;

  const paginatedRows = filteredList.slice(offset, offset + limit);
  const total = filteredList.length;

  return {
    rows: paginatedRows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
