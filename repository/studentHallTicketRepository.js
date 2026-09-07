import crypto from "crypto";
import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { studentClassSectionTermWithSectionInclude } from "../utility/classSectionIncludes.js";
import { expandClassSectionTermIdsByTerms } from "../utility/studentCount.js";
import * as examinationSessionRepository from "./examinationSessionRepository.js";
import {
  ELIGIBILITY_STATUS,
  HALL_TICKET_STUDENT_QUERY_PURPOSE,
} from "../constant.js";
import {
  normalizeEligibilityStatuses,
  buildReviewReasonEligibilityClause,
} from "../utility/hallTicketEligibility.js";

// -- Shared query helpers --

function buildHallTicketWhere(filters) {
  const where = {};
  if (filters.examinationSessionId) {
    where.examinationSessionId = filters.examinationSessionId;
  }
  if (filters.academicYearId) {
    where.academicYearId = filters.academicYearId;
  }
  if (filters.studentId) {
    where.studentId = Array.isArray(filters.studentId)
      ? { [Op.in]: filters.studentId }
      : filters.studentId;
  }
  return where;
}

function getHallTicketIncludes() {
  return [
    {
      model: model.instituteModel,
      as: "institute",
      attributes: ["instituteId", "instituteName"],
    },
    {
      model: model.universityModel,
      as: "university",
      attributes: ["universityId", "universityName"],
    },
    {
      model: model.acedmicYearModel,
      as: "academicYear",
      attributes: ["academicYearId", "yearTitle"],
    },
    {
      model: model.studentModel,
      as: "student",
      attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber", "courseId", "sessionId"],
      where: buildScope(model.studentModel),
      required: false,
      include: [
        studentClassSectionTermWithSectionInclude({
          sectionAttributes: ["classSectionsId", "year", "section", "sessionId"],
          includeSectionTerms: false,
        }),
      ],
    },
    {
      model: model.examinationSessionModel,
      as: "examinationSession",
      attributes: ["examinationSessionId", "sessionName", "examStartDate", "examEndDate", "assessmentTypeId", "academicYearId"],
      where: buildScope(model.examinationSessionModel),
      required: false,
      include: [
        {
          model: model.examSetupTypeModel,
          as: "assessmentType",
          attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
        },
        {
          model: model.acedmicYearModel,
          as: "academicYear",
          attributes: ["academicYearId", "yearTitle"],
        },
      ],
    },
  ];
}

const LIST_STUDENT_ATTRIBUTES = [
  "studentId",
  "firstName",
  "middleName",
  "lastName",
  "enrollNumber",
  "courseId",
  "sessionId",
  "classSectionTermId",
];

const REVIEW_DETAIL_STUDENT_ATTRIBUTES = [
  ...LIST_STUDENT_ATTRIBUTES,
  "scholarNumber",
  "fatherName",
  "birthDate",
  "phoneNumber",
  "email",
  "admisssionDate",
  "documentStatus",
  "studentPhoto",
  "pAddress",
  "pCity",
  "pState",
  "pCountry",
  "pPincode",
];

function buildStudentFilters(filters, termIds) {
  const studentWhere = { ...buildScope(model.studentModel) };

  if (filters.studentId) {
    studentWhere.studentId = Array.isArray(filters.studentId)
      ? { [Op.in]: filters.studentId }
      : Number(filters.studentId);
  }
  if (filters.courseId) {
    studentWhere.courseId = Array.isArray(filters.courseId)
      ? { [Op.in]: filters.courseId }
      : Number(filters.courseId);
  }
  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    studentWhere[Op.or] = [
      { enrollNumber: { [Op.like]: search } },
      { firstName: { [Op.like]: search } },
      { middleName: { [Op.like]: search } },
      { lastName: { [Op.like]: search } },
    ];
  }

  return studentWhere;
}

function buildSessionTermFilter(termIds, historyStudentIds) {
  return {
    [Op.or]: [
      { classSectionTermId: { [Op.in]: termIds } },
      { studentId: { [Op.in]: historyStudentIds } },
    ],
  };
}

function buildStudentListIncludes(examinationSessionId, termIds, eligibilityWhere, filters) {
  const purpose = filters.purpose || HALL_TICKET_STUDENT_QUERY_PURPOSE.LIST;
  const requireEligibility =
    !!filters.status ||
    filters.reviewReasonFilters !== undefined ||
    purpose === HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_FILTER;

  const includes = [
    {
      model: model.courseModel,
      as: "course",
      required: false,
      attributes: ["courseId", "courseName"],
    },
    {
      model: model.sessionModel,
      as: "studentSession",
      required: false,
      attributes: ["sessionId", "sessionName"],
    },
    {
      model: model.classSectionTermModel,
      as: "studentClassSectionTerm",
      required: false,
      attributes: ["classSectionTermId", "term"],
    },
    {
      model: model.studentClassSectionsHistoryModel,
      as: "sectionHistory",
      required: false,
      attributes: ["id", "studentId", "classSectionTermId"],
      where: buildScope(model.studentClassSectionsHistoryModel),
      include: [
        {
          model: model.classSectionTermModel,
          as: "classSectionTerm",
          required: false,
          attributes: ["classSectionTermId", "term"],
        },
      ],
    },
    {
      model: model.classStudentMapperModel,
      as: "studentMapped",
      required: false,
      where: { classSectionTermId: { [Op.in]: termIds } },
      attributes: ["classStudentMapperId", "studentId", "classSectionTermId", "sessionId", "academicYearId"],
    },
    {
      model: model.examinationSessionEligibilityModel,
      as: "examinationSessionEligibilities",
      required: requireEligibility,
      where: eligibilityWhere,
      attributes: ["examinationSessionId", "status", "reviewReason", "academicYearId"],
    },
  ];

  if (purpose !== HALL_TICKET_STUDENT_QUERY_PURPOSE.SUMMARY &&
      purpose !== HALL_TICKET_STUDENT_QUERY_PURPOSE.ELIGIBILITY_SYNC) {
    includes.push({
      model: model.studentHallTicketModel,
      as: "hallTickets",
      required: false,
      where: { examinationSessionId: Number(examinationSessionId) },
      attributes: ["id", "examinationSessionId", "isPublished", "isBlocked", "createdAt"],
    });
  }

  if (purpose === HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_DETAIL) {
    includes.push(
      {
        model: model.attendanceModel,
        as: "attendances",
        required: false,
        attributes: ["attendanceId", "classSectionTermId", "attendanceStatus"],
      },
      {
        model: model.studentFeeInvoiceModel,
        as: "studentFeeInvoices",
        required: false,
        attributes: ["studentFeeInvoiceId", "total", "paidAmount", "paymentStatus"],
      },
      {
        model: model.assessmentPlanModel,
        as: "assessmentPlans",
        required: false,
        attributes: ["assessmentPlanId", "courseId", "regulationId", "isActive"],
        include: [
          {
            model: model.academicRegulationModel,
            as: "academicRegulation",
            required: false,
            attributes: ["academicRegulationId", "regulationCode", "minimumAttendance"],
          },
        ],
      },
    );
  }

  return includes;
}

function resolveStudentAttributes(purpose) {
  if (purpose === HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_DETAIL) {
    return REVIEW_DETAIL_STUDENT_ATTRIBUTES;
  }
  if (purpose === HALL_TICKET_STUDENT_QUERY_PURPOSE.ELIGIBILITY_SYNC) {
    return [
      ...REVIEW_DETAIL_STUDENT_ATTRIBUTES,
      "universityId",
      "instituteId",
    ];
  }
  if (purpose === HALL_TICKET_STUDENT_QUERY_PURPOSE.SUMMARY) {
    return ["studentId", "courseId", "sessionId", "classSectionTermId"];
  }
  return LIST_STUDENT_ATTRIBUTES;
}

function mapStudentRowResult(raw, termIdSet, termToEstMap) {
  let placementTermId = null;
  let placementTerm = null;

  if (raw.studentClassSectionTerm && termIdSet.has(Number(raw.classSectionTermId))) {
    placementTermId = Number(raw.classSectionTermId);
    placementTerm = raw.studentClassSectionTerm.term;
  } else if (raw.sectionHistory && raw.sectionHistory.length > 0) {
    for (const hist of raw.sectionHistory) {
      if (!termIdSet.has(Number(hist.classSectionTermId))) continue;
      if (!hist.classSectionTerm) continue;
      placementTermId = Number(hist.classSectionTermId);
      placementTerm = hist.classSectionTerm.term;
      break;
    }
  }

  const estId =
    placementTerm != null ? termToEstMap[Number(placementTerm)] : null;

  return {
    student: raw,
    classSectionTerm: { classSectionTermId: placementTermId, term: placementTerm },
    examinationSessionTerm: {
      examinationSessionTermId: estId,
      term: placementTerm,
    },
    examinationSession: raw._examSession || null,
    mapperSessionId: raw.sessionId,
  };
}

// -- Examination session --

export async function findExaminationSessionById(examinationSessionId, transaction) {
  return scoped(model.examinationSessionModel).findByPk(examinationSessionId, {
    transaction,
    attributes: [
      "examinationSessionId",
      "sessionName",
      "academicYearId",
      "assessmentTypeId",
      "status",
    ],
    include: [
      {
        model: model.examSetupTypeModel,
        as: "assessmentType",
        attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
        where: buildScope(model.examSetupTypeModel),
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle"],
      },
      {
        model: model.examinationSessionTermModel,
        as: "examinationSessionTerms",
        attributes: ["examinationSessionTermId", "term"],
      },
    ],
  });
}

// -- Schedule queries --

export async function getSchedulesByExaminationSessionId(examinationSessionId, transaction) {
  return scoped(model.examScheduleModel).findAll({
    transaction,
    where: { examinationSessionId },
    attributes: ["examScheduleId", "examDate", "examTime"],
  });
}

export async function getSchedulesWithSubjectsForExaminationSession(examinationSessionId, filters = {}, transaction = null) {
  const { courseId, sessionId, term } = filters;

  return scoped(model.examScheduleModel).findAll({
    transaction,
    where: {
      examinationSessionId,
      ...(term != null && { term }),
      ...(sessionId != null && { sessionId }),
    },
    attributes: ["examScheduleId", "subjectId", "term", "examDate", "examTime", "duration", "type", "examinationSessionSlotId"],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        required: courseId != null,
        attributes: [
          "subjectId",
          "subjectName",
          "subjectCode",
          "courseId",
          "term",
          "academicYearId",
        ],
        where: { ...buildScope(model.subjectModel), ...(courseId != null && { courseId }) },
      },
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        required: false,
        attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime", "durationMinutes"],
      },
    ],
    order: [["examDate", "ASC"], ["examTime", "ASC"], ["examScheduleId", "ASC"]],
  });
}

// -- Student list --

export async function getStudentsByExaminationSessionId(examinationSessionId, filters = {}, transaction = null) {
  const purpose = filters.purpose || HALL_TICKET_STUDENT_QUERY_PURPOSE.LIST;
  const isPaginated = filters.page != null || filters.limit != null;

  const examSessionPromise = scoped(model.examinationSessionModel).findByPk(examinationSessionId, {
    attributes: ["examinationSessionId", "sessionName", "academicYearId", "assessmentTypeId"],
    transaction,
  });

  let filterCombinations = [];
  let mappingsPromise = Promise.resolve([]);
  if (filters.selections && filters.selections.length > 0) {
    const mappingIds = [];
    for (const sel of filters.selections) {
      mappingIds.push(sel.courseSessionMappingId);
    }
    mappingsPromise = examinationSessionRepository.findSessionCourseMappingsByIds(mappingIds, {
      transaction,
    });
  }

  const [examSession, dbMappings] = await Promise.all([examSessionPromise, mappingsPromise]);

  if (!examSession) {
    return isPaginated
      ? { rows: [], total: 0, page: 1, limit: 10, totalPages: 1 }
      : [];
  }

  if (filters.selections && filters.selections.length > 0) {
    const dbMappingsMap = new Map();
    for (const m of dbMappings) {
      dbMappingsMap.set(m.sessionCourseMappingId, m);
    }
    for (const sel of filters.selections) {
      const mapping = dbMappingsMap.get(sel.courseSessionMappingId);
      if (!mapping) continue;
      filterCombinations.push({
        courseId: mapping.courseId,
        sessionId: mapping.sessionId,
        terms: sel.terms || [],
      });
    }
  }

  // Fetch terms for this session.
  const termQueryOptions = {
    where: { examinationSessionId },
    attributes: ["term", "examinationSessionTermId"],
    transaction,
  };

  // Resolve target terms dynamically
  if (filterCombinations.length > 0) {
    const termsList = [];
    const termSeen = new Set();
    for (const comb of filterCombinations) {
      for (const term of comb.terms) {
        if (termSeen.has(term)) continue;
        termSeen.add(term);
        termsList.push(term);
      }
    }
    termQueryOptions.where.term = { [Op.in]: termsList };
  } else if (filters.term != null) {
    termQueryOptions.where.term = Array.isArray(filters.term)
      ? { [Op.in]: filters.term }
      : filters.term;
  }

  const termRows = await scoped(model.examinationSessionTermModel).findAll(termQueryOptions);
  const sessionTermNumbers = [];
  const termToEstMap = {};
  for (const row of termRows) {
    const termNumber = Number(row.term);
    sessionTermNumbers.push(termNumber);
    termToEstMap[termNumber] = row.examinationSessionTermId;
  }

  if (!sessionTermNumbers.length) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    return isPaginated ? { rows: [], total: 0, page, limit, totalPages: 1 } : [];
  }

  const expansion = await expandClassSectionTermIdsByTerms(
    sessionTermNumbers,
    examSession.academicYearId,
    { transaction },
  );
  const termIds = expansion.classSectionTermIds;
  const termIdSet = new Set(termIds);
  const expandedGroups = expansion.expandedGroups || [];

  if (!termIds.length) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    return isPaginated ? { rows: [], total: 0, page, limit, totalPages: 1 } : [];
  }

  // Fetch student IDs from history for the matched terms.
  const historyMatchedRows = await model.studentClassSectionsHistoryModel.findAll({
    attributes: ["studentId", "classSectionTermId"],
    where: { classSectionTermId: { [Op.in]: termIds } },
    raw: true,
    transaction,
  });
  const historyStudentIds = [];
  const historyByTermId = new Map();
  for (const row of historyMatchedRows) {
    const sid = Number(row.studentId);
    const cstId = Number(row.classSectionTermId);
    historyStudentIds.push(sid);
    const list = historyByTermId.get(cstId);
    if (list) list.push(sid);
    else historyByTermId.set(cstId, [sid]);
  }

  const studentWhere = buildStudentFilters(filters, termIds);
  const sessionTermFilter = buildSessionTermFilter(termIds, historyStudentIds);
  const combinedWhere = { [Op.and]: [studentWhere, sessionTermFilter] };

  if (filterCombinations.length > 0) {
    const orClauses = [];
    for (const comb of filterCombinations) {
      const termSet = new Set();
      for (const term of comb.terms) {
        termSet.add(Number(term));
      }

      const termIdsForComb = [];
      for (const group of expandedGroups) {
        if (
          group.courseId === Number(comb.courseId) &&
          group.sessionId === Number(comb.sessionId) &&
          termSet.has(group.term)
        ) {
          termIdsForComb.push(group.classSectionTermId);
        }
      }

      const historyIdsForComb = [];
      const historyIdSet = new Set();
      for (const cstId of termIdsForComb) {
        const ids = historyByTermId.get(cstId);
        if (!ids) continue;
        for (const sid of ids) {
          if (historyIdSet.has(sid)) continue;
          historyIdSet.add(sid);
          historyIdsForComb.push(sid);
        }
      }

      orClauses.push({
        courseId: comb.courseId,
        sessionId: comb.sessionId,
        [Op.or]: [
          { classSectionTermId: { [Op.in]: termIdsForComb } },
          { studentId: { [Op.in]: historyIdsForComb } },
        ],
      });
    }
    combinedWhere[Op.and].push({ [Op.or]: orClauses });
  } else if (filters.sessionId) {
    const allowedSessions = Array.isArray(filters.sessionId)
      ? filters.sessionId.map(Number)
      : [Number(filters.sessionId)];
    combinedWhere[Op.and].push({
      sessionId: { [Op.in]: allowedSessions },
    });
  }

  // Build eligibility filter.
  const eligibilityWhere = { examinationSessionId: Number(examinationSessionId) };
  const normalizedStatuses = normalizeEligibilityStatuses(filters.status);
  if (normalizedStatuses) {
    eligibilityWhere.status = { [Op.in]: normalizedStatuses };
  }
  if (purpose === HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_FILTER && !normalizedStatuses) {
    eligibilityWhere.status = ELIGIBILITY_STATUS.REVIEW;
  }

  const reviewReasonInput =
    purpose === HALL_TICKET_STUDENT_QUERY_PURPOSE.REVIEW_FILTER
      ? filters.reviewReasonFilters && filters.reviewReasonFilters.length > 0
        ? filters.reviewReasonFilters
        : []
      : filters.reviewReasonFilters;

  const reviewReasonClause = buildReviewReasonEligibilityClause(reviewReasonInput, Op);
  if (reviewReasonClause) {
    Object.assign(eligibilityWhere, reviewReasonClause);
  }

  const include = buildStudentListIncludes(
    examinationSessionId,
    termIds,
    eligibilityWhere,
    { ...filters, purpose },
  );

  const queryOptions = {
    attributes: resolveStudentAttributes(purpose),
    where: combinedWhere,
    include,
    transaction,
    distinct: true,
    col: "student_id",
    subQuery: false,
  };

  let rows = [];
  let count = 0;

  if (isPaginated) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    queryOptions.limit = limit;
    queryOptions.offset = (page - 1) * limit;

    const result = await scoped(model.studentModel).findAndCountAll(queryOptions);
    rows = result.rows;
    count = result.count;
  } else {
    rows = await scoped(model.studentModel).findAll(queryOptions);
    count = rows.length;
  }

  const examSessionPlain = examSession.get ? examSession.get({ plain: true }) : examSession;

  const mappedRows = [];
  for (const raw of rows) {
    const mapped = mapStudentRowResult(raw, termIdSet, termToEstMap);
    mapped.examinationSession = examSessionPlain;
    mappedRows.push(mapped);
  }

  if (isPaginated) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    return {
      rows: mappedRows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    };
  }

  return mappedRows;
}

// -- Hall ticket reads --

export async function findHallTicketByStudentAndSession(studentId, examinationSessionId, transaction = null) {
  return scoped(model.studentHallTicketModel).findOne({
    where: { studentId, examinationSessionId },
    attributes: ["id", "isPublished", "isBlocked", "createdAt"],
    transaction,
  });
}

export async function getHallTicketById(id, transaction) {
  return scoped(model.studentHallTicketModel).findByPk(id, {
    transaction,
    include: getHallTicketIncludes(),
  });
}

export async function getHallTicketByQr(qr, transaction) {
  return scoped(model.studentHallTicketModel).findOne({
    transaction,
    where: { qr },
    include: getHallTicketIncludes(),
  });
}

export async function getAllHallTickets(filters = {}, transaction, options = {}) {
  const where = buildHallTicketWhere(filters);
  const query = {
    transaction,
    where,
    include: getHallTicketIncludes(),
    order: [["id", "DESC"]],
  };
  if (options.limit != null) query.limit = options.limit;
  if (options.offset != null) query.offset = options.offset;

  return scoped(model.studentHallTicketModel).findAll(query);
}

export async function countHallTickets(filters = {}, transaction) {
  const where = buildHallTicketWhere(filters);
  return scoped(model.studentHallTicketModel).count({ where, transaction });
}

export async function countHallTicketsBySessionIds(examinationSessionIds, transaction) {
  if (!examinationSessionIds || examinationSessionIds.length === 0) return new Map();

  const rows = await scoped(model.studentHallTicketModel).findAll({
    attributes: [
      "examinationSessionId",
      [fn("COUNT", col("student_hall_ticket.id")), "count"],
    ],
    where: { examinationSessionId: { [Op.in]: examinationSessionIds } },
    group: ["examinationSessionId"],
    raw: true,
    transaction,
  });

  const result = new Map();
  for (const row of rows) {
    result.set(row.examinationSessionId, Number(row.count));
  }
  return result;
}

// -- Hall ticket writes --

export async function bulkCreateHallTickets(payloads, transaction) {
  return scoped(model.studentHallTicketModel).bulkCreate(payloads, { transaction });
}

export async function generateOrRegenerateStudentHallTicket(
  { examinationSessionId, academicYearId, studentId, markAsEligible = false, markedBy = null, previousEligibilityStatus = null },
  transaction = null,
) {
  let ticket = await scoped(model.studentHallTicketModel).findOne({
    where: { examinationSessionId, studentId },
    transaction,
  });

  const updateFields = { isBlocked: false, blockedAt: null, updatedAt: new Date() };
  if (markAsEligible) {
    updateFields.markAsEligible = true;
    updateFields.markedBy = markedBy;
    updateFields.markedAt = new Date();
    updateFields.previousEligibilityStatus = previousEligibilityStatus;
  }

  if (ticket) {
    await ticket.update(updateFields, { transaction });
  } else {
    ticket = await scoped(model.studentHallTicketModel).create(
      {
        examinationSessionId,
        academicYearId,
        studentId,
        qr: crypto.randomUUID(),
        isBlocked: false,
        isPublished: false,
        ...(markAsEligible && { markAsEligible: true, markedBy, markedAt: new Date(), previousEligibilityStatus }),
      },
      { transaction },
    );
  }

  return ticket;
}

export async function publishHallTickets(examinationSessionId, studentIds = null, transaction = null) {
  const whereClause = { examinationSessionId, isBlocked: false };
  if (studentIds && studentIds.length > 0) {
    whereClause.studentId = { [Op.in]: studentIds };
  }

  const [updatedCount] = await scoped(model.studentHallTicketModel).update(
    { isPublished: true, publishedAt: new Date() },
    { where: whereClause, transaction },
  );
  return updatedCount;
}

export async function blockHallTicket(id, transaction) {
  const ticket = await scoped(model.studentHallTicketModel).findByPk(id, { transaction });
  if (!ticket) return null;
  await ticket.update({ isBlocked: true, blockedAt: new Date() }, { transaction });
  return ticket;
}

// -- Seating and mapping --

export async function getMappedExamScheduleIds(studentId, examScheduleIds, transaction) {
  if (!examScheduleIds || examScheduleIds.length === 0) return [];

  const student = await scoped(model.studentModel).findOne({
    where: { studentId },
    attributes: ["studentId"],
    transaction,
  });
  if (!student) return [];

  const answerSheetQrs = await scoped(model.answerSheetQrModel).findAll({
    where: { studentId, examScheduleId: examScheduleIds },
    attributes: ["examScheduleId"],
    transaction,
  });

  const ids = [];
  for (const row of answerSheetQrs) {
    ids.push(row.examScheduleId);
  }
  return ids;
}

export async function getStudentRoomSeatingDetails(studentId, examScheduleIds, transaction) {
  if (!examScheduleIds || !examScheduleIds.length) return new Map();

  const seats = await scoped(model.studentExamSeatModel).findAll({
    where: { studentId },
    attributes: ["studentExamSeatId", "row", "column", "examScheduleRoomCapacityId"],
    include: [
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacity",
        attributes: ["examScheduleRoomCapacityId", "examScheduleId"],
        where: { examScheduleId: { [Op.in]: examScheduleIds } },
        include: [
          {
            model: model.classRoomModel,
            as: "classRoom",
            attributes: ["classRoomSectionId", "roomNumber"],
          },
        ],
      },
    ],
    transaction,
  });

  const seatMap = new Map();
  for (const seat of seats) {
    const roomCap = seat.roomCapacity;
    if (!roomCap) continue;
    seatMap.set(roomCap.examScheduleId, {
      row: seat.row,
      column: seat.column,
      roomName: roomCap.classRoom ? roomCap.classRoom.roomNumber : null,
      roomNumber: roomCap.classRoom ? roomCap.classRoom.roomNumber : null,
      block: null,
    });
  }
  return seatMap;
}
