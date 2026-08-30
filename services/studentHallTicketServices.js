import sequelize from "../database/sequelizeConfig.js";
import { getAcademicYearId } from "../utility/requestContext.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
import * as examinationSessionEligibilityRepo from "../repository/examinationSessionEligibilityRepository.js";
import * as examinationSessionEligibilityServices from "./examinationSessionEligibilityServices.js";
import {
  ELIGIBILITY_STATUS,
  ELIGIBILITY_STATUS_LABEL,
  HALL_TICKET_STUDENT_QUERY_PURPOSE,
  HALL_TICKET_REVIEW_FILTER,
} from "../constant.js";
import {
  resolveEligibilityStatus,
  mapEligibilityStatusToFrontend,
  resolveHallTicketStatus,
  evaluateReviewConditions,
} from "../utility/hallTicketEligibility.js";

export { evaluateReviewConditions };

// -- Student row mapper --

function mapStudentRow(raw, dbStatus) {
  const student = raw.student;
  const hallTicket =
    student.hallTickets && student.hallTickets.length > 0
      ? student.hallTickets[0]
      : null;
  const isGenerated = Boolean(hallTicket);
  const isPublished = hallTicket ? hallTicket.isPublished : false;
  const isBlocked =
    dbStatus === ELIGIBILITY_STATUS.BLOCKED
      ? true
      : hallTicket
        ? hallTicket.isBlocked
        : false;
  const eligibilityRecord =
    student.examinationSessionEligibilities &&
    student.examinationSessionEligibilities.length > 0
      ? student.examinationSessionEligibilities[0]
      : null;

  return {
    studentId: student.studentId,
    enrollmentNumber: student.enrollNumber,
    firstName: student.firstName || null,
    middleName: student.middleName || null,
    lastName: student.lastName || null,
    courseId: student.courseId,
    courseName: student.course ? student.course.courseName : null,
    sessionId: raw.mapperSessionId,
    sessionName: student.studentSession ? student.studentSession.sessionName : null,
    term: raw.classSectionTerm ? raw.classSectionTerm.term : null,
    examinationSessionTermId: raw.examinationSessionTerm
      ? raw.examinationSessionTerm.examinationSessionTermId
      : null,
    classSectionTermId: raw.classSectionTerm
      ? raw.classSectionTerm.classSectionTermId
      : null,

    totalClasses: null,
    presentClasses: null,
    attendancePercentage: null,
    minimumAttendance: null,

    hallTicketId: hallTicket ? hallTicket.id : null,
    isGenerated,
    isPublished,
    isBlocked,
    markAsEligible: dbStatus === ELIGIBILITY_STATUS.APPROVED,
    hallTicketStatus: resolveHallTicketStatus(hallTicket, isBlocked),
    eligibilityStatus: mapEligibilityStatusToFrontend(dbStatus),
    reasonText: eligibilityRecord ? eligibilityRecord.reviewReason : null,
    eligibilityReason:
      dbStatus !== ELIGIBILITY_STATUS.READY &&
      dbStatus !== ELIGIBILITY_STATUS.APPROVED &&
      eligibilityRecord
        ? eligibilityRecord.reviewReason
        : null,
  };
}

// -- Student list --

export async function getStudentsForExaminationSession(examinationSessionId, filters = {}) {
  const repoResult = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    { ...filters, purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.LIST },
  );

  const isPaginated = filters.page != null || filters.limit != null;
  const rawList = isPaginated ? repoResult.rows : repoResult;

  const processed = [];
  for (const raw of rawList) {
    const eligibilityRecords = raw.student.examinationSessionEligibilities;
    const eligibilityRecord =
      eligibilityRecords && eligibilityRecords.length > 0 ? eligibilityRecords[0] : null;
    const dbStatus = eligibilityRecord
      ? eligibilityRecord.status
      : ELIGIBILITY_STATUS.REVIEW;
    processed.push(mapStudentRow(raw, dbStatus));
  }

  if (!isPaginated) return processed;

  return {
    rows: processed,
    total: repoResult.total,
    page: repoResult.page,
    limit: repoResult.limit,
    totalPages: repoResult.totalPages,
  };
}

// -- Eligibility overview counts --

export async function getHallTicketEligibilityOverview(examinationSessionId, filters = {}) {
  const repoResult = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    {
      courseId: filters.courseId,
      sessionId: filters.sessionId,
      term: filters.term,
      selections: filters.selections,
      purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.LIST,
    },
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
    const studentId = student.studentId;
    if (seenStudents.has(studentId)) continue;
    seenStudents.add(studentId);

    totalStudents++;

    const eligibilityRecords = student.examinationSessionEligibilities;
    const eligibilityRecord =
      eligibilityRecords && eligibilityRecords.length > 0 ? eligibilityRecords[0] : null;
    const dbStatus = eligibilityRecord
      ? eligibilityRecord.status
      : ELIGIBILITY_STATUS.REVIEW;

    if (dbStatus === ELIGIBILITY_STATUS.READY) ready++;
    else if (dbStatus === ELIGIBILITY_STATUS.APPROVED) approved++;
    else if (dbStatus === ELIGIBILITY_STATUS.BLOCKED) blocked++;
    else review++;

    const hallTickets = student.hallTickets;
    const hallTicket =
      hallTickets && hallTickets.length > 0 ? hallTickets[0] : null;
    if (hallTicket) {
      generatedCount++;
      if (hallTicket.isPublished) publishedCount++;
    } else if (
      dbStatus === ELIGIBILITY_STATUS.READY ||
      dbStatus === ELIGIBILITY_STATUS.APPROVED
    ) {
      readyAndApprovedNotGenerated++;
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

// -- Summary --

export async function getHallTicketSummary(examinationSessionId, filters = {}) {
  const { page, limit, ...queryFilters } = filters;
  const rawList = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    examinationSessionId,
    { ...queryFilters, purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.SUMMARY },
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
    const studentId = student.studentId;
    if (seenStudents.has(studentId)) continue;
    seenStudents.add(studentId);

    totalStudents++;

    const term = raw.classSectionTerm ? raw.classSectionTerm.term : "Unknown Term";
    const courseId = student.courseId != null ? student.courseId : "Unknown Course";
    const sessionId =
      raw.mapperSessionId != null ? raw.mapperSessionId : "Unknown Session";
    const courseName = student.course ? student.course.courseName : "Unknown";
    const sessionName = student.studentSession
      ? student.studentSession.sessionName
      : "Unknown";

    if (!termWiseMap.has(term)) termWiseMap.set(term, { term, ...blankStat() });

    const cstKey = `${courseId}_${sessionId}_${term}`;
    if (!courseSessionTermWiseMap.has(cstKey)) {
      courseSessionTermWiseMap.set(cstKey, {
        courseId,
        courseName,
        sessionId,
        sessionName,
        term,
        ...blankStat(),
      });
    }

    const termObj = termWiseMap.get(term);
    const cstObj = courseSessionTermWiseMap.get(cstKey);

    termObj.totalStudents++;
    cstObj.totalStudents++;

    const eligibilityRecords = student.examinationSessionEligibilities;
    const eligibilityRecord =
      eligibilityRecords && eligibilityRecords.length > 0 ? eligibilityRecords[0] : null;
    const status = eligibilityRecord
      ? eligibilityRecord.status
      : ELIGIBILITY_STATUS.REVIEW;
    const conditions = evaluateReviewConditions(
      eligibilityRecord ? eligibilityRecord.reviewReason || "" : "",
      null,
    );

    if (status === ELIGIBILITY_STATUS.APPROVED) {
      approvedStudentCount++;
      termObj.approvedStudentCount++;
      cstObj.approvedStudentCount++;
    }

    if (status !== ELIGIBILITY_STATUS.APPROVED && status !== ELIGIBILITY_STATUS.READY) {
      if (conditions[HALL_TICKET_REVIEW_FILTER.ATTENDANCE_PENDING]) {
        attendanceShortage++;
        termObj.attendanceShortage++;
        cstObj.attendanceShortage++;
      }
      if (conditions[HALL_TICKET_REVIEW_FILTER.REGISTRATION_PENDING]) {
        registrationPending++;
        termObj.registrationPending++;
        cstObj.registrationPending++;
      }
      if (conditions[HALL_TICKET_REVIEW_FILTER.PHOTOGRAPH_PENDING]) {
        missingPhotograph++;
        termObj.missingPhotograph++;
        cstObj.missingPhotograph++;
      }
      if (conditions[HALL_TICKET_REVIEW_FILTER.INVOICE_PENDING]) {
        feeClearance++;
        termObj.feeClearance++;
        cstObj.feeClearance++;
      }
    }
  }

  const summary = {
    totalStudents,
    approvedStudentCount,
    feeClearance,
    attendanceShortage,
    registrationPending,
    missingPhotograph,
  };

  if (filters.courseId && filters.term && filters.sessionId) return summary;

  const termWise = [];
  for (const value of termWiseMap.values()) {
    termWise.push(value);
  }
  const courseSessionTermWise = [];
  for (const value of courseSessionTermWiseMap.values()) {
    courseSessionTermWise.push(value);
  }

  return {
    ...summary,
    termWise,
    courseSessionTermWise,
  };
}

// -- Review filter --

export async function getStudentsByReviewReasons(examinationSessionId, filters = {}) {
  const repoResult = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    {
      courseId: filters.courseId,
      sessionId: filters.sessionId,
      term: filters.term,
      selections: filters.selections,
      search: filters.search,
      page: filters.page,
      limit: filters.limit,
      purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_FILTER,
      reviewReasonFilters: filters.filters,
      status: [ELIGIBILITY_STATUS.REVIEW],
    },
  );

  const processed = [];
  for (const raw of repoResult.rows) {
    const eligibilityRecords = raw.student.examinationSessionEligibilities;
    const eligibilityRecord =
      eligibilityRecords && eligibilityRecords.length > 0 ? eligibilityRecords[0] : null;
    const reason = eligibilityRecord ? eligibilityRecord.reviewReason || "" : "";
    processed.push({
      ...mapStudentRow(raw, ELIGIBILITY_STATUS.REVIEW),
      reasonText: reason || null,
      eligibilityReason: reason || null,
    });
  }

  return {
    rows: processed,
    total: repoResult.total,
    page: repoResult.page,
    limit: repoResult.limit,
    totalPages: repoResult.totalPages,
  };
}

// -- Detailed eligibility --

export async function getReviewDetails({ studentId, examinationSessionId }) {
  const list = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    {
      studentId: Number(studentId),
      purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_DETAIL,
    },
  );
  const rawRecord = list[0];

  if (!rawRecord) {
    const error = new Error("Student not found in this examination session");
    error.statusCode = 404;
    throw error;
  }

  const calculated =
    examinationSessionEligibilityServices.calculateStudentEligibility(rawRecord);
  const eligibilityRecords = rawRecord.student.examinationSessionEligibilities;
  const eligibilityRecord =
    eligibilityRecords && eligibilityRecords.length > 0 ? eligibilityRecords[0] : null;
  const storedStatus = eligibilityRecord
    ? eligibilityRecord.status
    : ELIGIBILITY_STATUS.REVIEW;

  const dynamicStatus = calculated.eligibilityStatus.toUpperCase();
  const resolvedStatus = resolveEligibilityStatus(storedStatus, dynamicStatus);
  const finalEligibilityStatus = mapEligibilityStatusToFrontend(resolvedStatus);

  const hallTickets = rawRecord.student.hallTickets;
  const hallTicketRecord =
    hallTickets && hallTickets.length > 0 ? hallTickets[0] : null;
  const isGenerated = Boolean(hallTicketRecord);
  const isPublished = hallTicketRecord ? hallTicketRecord.isPublished : false;
  const isBlocked =
    resolvedStatus === ELIGIBILITY_STATUS.BLOCKED
      ? true
      : hallTicketRecord
        ? hallTicketRecord.isBlocked
        : false;

  const examSession = rawRecord.examinationSession;

  return {
    eligibilityStatus: finalEligibilityStatus,
    hallTicketStatus: resolveHallTicketStatus(hallTicketRecord, isBlocked),
    hallTicketId: hallTicketRecord ? hallTicketRecord.id : null,
    isGenerated,
    isPublished,
    isBlocked,
    markAsEligible: storedStatus === ELIGIBILITY_STATUS.APPROVED,
    student: calculated.student,
    examination: {
      examinationSessionId: Number(examinationSessionId),
      sessionName: examSession ? examSession.sessionName : null,
      assessmentTypeId: examSession ? examSession.assessmentTypeId : null,
      examSetupTypeTermId: calculated.academicContext.examSetupTypeTermId || null,
      examinationSessionTermId: calculated.academicContext.examinationSessionTermId,
    },
    attendance: calculated.attendance,
    regulation: calculated.regulation,
    reviewReasons: calculated.reviewReasons,
    overview: {
      eligibleNormally: finalEligibilityStatus === ELIGIBILITY_STATUS_LABEL.READY,
      requiresReview: finalEligibilityStatus === ELIGIBILITY_STATUS_LABEL.REVIEW,
      isBlocked: finalEligibilityStatus === ELIGIBILITY_STATUS_LABEL.BLOCKED,
      canGenerateNormally:
        !isGenerated &&
        (finalEligibilityStatus === ELIGIBILITY_STATUS_LABEL.READY ||
          finalEligibilityStatus === ELIGIBILITY_STATUS_LABEL.REVIEW),
      canGenerateWithOverride:
        !isGenerated && finalEligibilityStatus === ELIGIBILITY_STATUS_LABEL.REVIEW,
    },
  };
}

export async function getStudentEligibilityDetails(examinationSessionId, studentId) {
  const list = await studentHallTicketRepository.getStudentsByExaminationSessionId(
    Number(examinationSessionId),
    {
      studentId: Number(studentId),
      purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_DETAIL,
    },
  );
  const rawRecord = list[0];
  if (!rawRecord) {
    const error = new Error("Student not found in this examination session");
    error.statusCode = 404;
    throw error;
  }

  const calculated =
    examinationSessionEligibilityServices.calculateStudentEligibility(rawRecord);
  const dynamicStatus = calculated.eligibilityStatus.toUpperCase();

  const eligibilityRecords = rawRecord.student.examinationSessionEligibilities;
  const eligibilityRecord =
    eligibilityRecords && eligibilityRecords.length > 0 ? eligibilityRecords[0] : null;
  if (!eligibilityRecord) {
    const error = new Error("Student eligibility record not found for this session");
    error.statusCode = 404;
    throw error;
  }

  const storedStatus = eligibilityRecord.status;
  const resolvedStatus = resolveEligibilityStatus(storedStatus, dynamicStatus);
  const finalEligibilityStatus = mapEligibilityStatusToFrontend(resolvedStatus);

  const hallTickets = rawRecord.student.hallTickets;
  const hallTicketRecord =
    hallTickets && hallTickets.length > 0 ? hallTickets[0] : null;

  return {
    ...calculated.student,
    ...calculated.attendance,
    storedStatus,
    dynamicStatus,
    eligibilityStatus: finalEligibilityStatus,
    eligibilityReason:
      resolvedStatus !== ELIGIBILITY_STATUS.READY &&
      resolvedStatus !== ELIGIBILITY_STATUS.APPROVED
        ? calculated.reasonText || null
        : null,
    isGenerated: Boolean(hallTicketRecord),
    isPublished: hallTicketRecord ? hallTicketRecord.isPublished : false,
    isBlocked: hallTicketRecord ? hallTicketRecord.isBlocked : false,
    markAsEligible: storedStatus === ELIGIBILITY_STATUS.APPROVED,
    hallTicketStatus: resolveHallTicketStatus(
      hallTicketRecord,
      resolvedStatus === ELIGIBILITY_STATUS.BLOCKED,
    ),
    hallTicketId: hallTicketRecord ? hallTicketRecord.id : null,
    canGenerateHallTicket:
      resolvedStatus === ELIGIBILITY_STATUS.READY ||
      resolvedStatus === ELIGIBILITY_STATUS.APPROVED,
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

  let canGenerate = false;
  for (const schedule of schedules) {
    if (schedule.examDate && schedule.examTime) {
      canGenerate = true;
      break;
    }
  }

  return {
    examinationSession,
    totalSchedules: schedules.length,
    canGenerate,
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
      (user && user.academicYearId ? Number(user.academicYearId) : undefined) ||
      readiness.examinationSession.academicYearId;

    const eligibleStudentIds =
      await examinationSessionEligibilityRepo.getEligibleStudentIdsForGeneration(
        examinationSessionId,
        studentIds,
        { transaction },
      );

    if (!eligibleStudentIds.length) return { generatedCount: 0, hallTickets: [] };

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

// -- Mark as eligible --

export async function markAsEligible({ examinationSessionId, studentIds, user }) {
  return await sequelize.transaction(async (transaction) => {
    const requestedCount = studentIds.length;
    const approvedCount = await examinationSessionEligibilityRepo.bulkApproveEligibility(
      examinationSessionId,
      studentIds,
      (user && user.userId) || (user && user.id),
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
    let targets = null;
    if (studentIds && studentIds.length > 0) {
      const membership =
        await studentHallTicketRepository.getStudentsByExaminationSessionId(
          examinationSessionId,
          {
            studentId: studentIds,
            page: 1,
            limit: 1,
            purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.SUMMARY,
          },
          transaction,
        );

      if (membership.total !== studentIds.length) {
        const error = new Error(
          `One or more students are not associated with examination session ${examinationSessionId}`,
        );
        error.statusCode = 400;
        throw error;
      }
      targets = studentIds;
    }

    const generatedCount = await studentHallTicketRepository.countHallTickets(
      {
        examinationSessionId,
        ...(targets ? { studentId: targets } : {}),
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
  if (plain.subjectSchedule && plain.subjectSchedule.term != null) {
    return Number(plain.subjectSchedule.term);
  }
  return null;
}

function schedulesToSubjectList(scheduleRows, mappedScheduleIds, roomSeatingMap) {
  const mappedSet = new Set(mappedScheduleIds);
  const subjects = [];

  for (const row of scheduleRows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const sub = plain.subjectSchedule;
    const seatInfo = roomSeatingMap.get(plain.examScheduleId);

    let seatNumber = "";
    if (seatInfo && seatInfo.row && seatInfo.column) {
      const rowChar = String.fromCharCode(64 + Number(seatInfo.row));
      seatNumber = `${rowChar}${seatInfo.column}`;
    }

    subjects.push({
      examScheduleId: plain.examScheduleId,
      isMapped:
        plain.examScheduleId != null && mappedSet.has(plain.examScheduleId),
      subjectId: sub
        ? sub.subjectId
        : plain.subjectId != null
          ? plain.subjectId
          : null,
      subjectName: sub ? sub.subjectName : null,
      subjectCode: sub ? sub.subjectCode : null,
      term: resolveScheduleTerm(plain),
      examDate: plain.examDate || null,
      examTime: plain.examTime || null,
      duration: plain.duration || null,
      scheduleKind: plain.type || null,
      slot: plain.examinationSessionSlot || null,
      subject: sub || null,
      seating: seatInfo
        ? {
            row: seatInfo.row,
            column: seatInfo.column,
            seatNumber,
            roomNumber: seatInfo.roomNumber,
          }
        : null,
    });
  }

  return subjects;
}

function flattenHallTicketDetail(ticket, scheduleRows, mappedScheduleIds, roomSeatingMap) {
  const st = ticket.student;
  const es = ticket.examinationSession;
  const assessmentType = es ? es.assessmentType : null;
  const academicYear = ticket.academicYear || (es ? es.academicYear : null);

  return {
    id: ticket.id,
    qr: ticket.qr,
    examinationSessionId: ticket.examinationSessionId,
    academicYearId: ticket.academicYearId,
    studentId: ticket.studentId,
    instituteId: ticket.instituteId,
    universityId: ticket.universityId,
    isBlocked: ticket.isBlocked || false,
    isPublished: ticket.isPublished || false,
    publishedAt: ticket.publishedAt || null,
    blockedAt: ticket.blockedAt || null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    studentFirstName: st ? st.firstName : null,
    studentMiddleName: st ? st.middleName : null,
    studentLastName: st ? st.lastName : null,
    scholarNumber: st ? st.scholarNumber : null,
    enrollNumber: st ? st.enrollNumber : null,
    sessionName: es ? es.sessionName : null,
    academicYearTitle: academicYear ? academicYear.yearTitle : null,
    assessmentTypeId: es ? es.assessmentTypeId : null,
    examType: assessmentType ? assessmentType.examCategory : null,
    examName: assessmentType ? assessmentType.examName : null,
    subjects: schedulesToSubjectList(scheduleRows, mappedScheduleIds, roomSeatingMap),
  };
}

async function fetchHallTicketWithSchedules(ticket, transaction) {
  const student = ticket.student;
  if (!student) {
    return flattenHallTicketDetail(ticket, [], [], new Map());
  }

  const term = student.studentClassSectionTerm
    ? student.studentClassSectionTerm.term
    : null;
  const courseId = student.courseId;
  const sessionId = student.sessionId;

  if (term == null || courseId == null || sessionId == null) {
    return flattenHallTicketDetail(ticket, [], [], new Map());
  }

  const schedules =
    await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
      ticket.examinationSessionId,
      { courseId, sessionId, term },
      transaction,
    );

  const examScheduleIds = [];
  for (const schedule of schedules) {
    if (schedule.examScheduleId != null) {
      examScheduleIds.push(schedule.examScheduleId);
    }
  }

  const [mappedScheduleIds, roomSeatingMap] = await Promise.all([
    studentHallTicketRepository.getMappedExamScheduleIds(
      ticket.studentId,
      examScheduleIds,
      transaction,
    ),
    studentHallTicketRepository.getStudentRoomSeatingDetails(
      ticket.studentId,
      examScheduleIds,
      transaction,
    ),
  ]);

  return flattenHallTicketDetail(
    ticket,
    schedules,
    mappedScheduleIds,
    roomSeatingMap,
  );
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
  const page = pagination.page != null ? pagination.page : 1;
  const rawLimit = pagination.limit != null ? pagination.limit : 1000;
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
  if (query.examinationSessionId) {
    filters.examinationSessionId = query.examinationSessionId;
  }
  const academicYearId =
    query.academicYearId ||
    getAcademicYearId() ||
    (user && user.academicYearId ? Number(user.academicYearId) : undefined);
  if (academicYearId) filters.academicYearId = academicYearId;
  if (query.studentId) filters.studentId = query.studentId;

  return getAllHallTickets(filters, { page: query.page, limit: query.limit });
}
