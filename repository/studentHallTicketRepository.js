import crypto from "crypto";
import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { studentClassSectionTermWithSectionInclude } from "../utility/classSectionIncludes.js";
import * as examinationSessionRepository from "./examinationSessionRepository.js";

// -- Shared query helpers --

function buildHallTicketWhere(filters) {
  const where = {};
  if (filters.examinationSessionId) where.examinationSessionId = filters.examinationSessionId;
  if (filters.academicYearId) where.academicYearId = filters.academicYearId;
  if (filters.studentId) where.studentId = filters.studentId;
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

function buildSessionTermFilter(termIds, relatedStudentIds) {
  const orFilters = [{ classSectionTermId: { [Op.in]: termIds } }];
  if (relatedStudentIds.length > 0) {
    orFilters.push({ studentId: { [Op.in]: relatedStudentIds } });
  }
  return { [Op.or]: orFilters };
}

/**
 * Distinct students linked to classSectionTermIds via:
 * students.class_section_term_id (primary) or section history.
 * Do not use class_student_mapper_depricated.
 */
export async function findDistinctStudentIdsByClassSectionTermIds(
  termIds,
  options = {},
) {
  if (!termIds || termIds.length === 0) {
    return {
      studentIds: [],
      historyRows: [],
      historyStudentIds: [],
    };
  }

  const transaction = options.transaction;
  const termIdFilter = { classSectionTermId: { [Op.in]: termIds } };

  const [directRows, historyRows] = await Promise.all([
    scoped(model.studentModel).findAll({
      attributes: ["studentId"],
      where: termIdFilter,
      raw: true,
      transaction,
    }),
    model.studentClassSectionsHistoryModel.findAll({
      attributes: ["studentId", "classSectionTermId"],
      where: termIdFilter,
      raw: true,
      transaction,
    }),
  ]);

  const studentIds = new Set();
  for (const row of directRows) {
    studentIds.add(Number(row.studentId));
  }
  for (const row of historyRows) {
    studentIds.add(Number(row.studentId));
  }

  return {
    studentIds: [...studentIds],
    historyRows,
    historyStudentIds: [
      ...new Set(historyRows.map((r) => Number(r.studentId))),
    ],
  };
}

export async function countDistinctStudentsByClassSectionTermIds(
  termIds,
  options = {},
) {
  const resolved = await findDistinctStudentIdsByClassSectionTermIds(
    termIds,
    options,
  );
  return resolved.studentIds.length;
}

function buildStudentListIncludes(examinationSessionId, termIds, eligibilityWhere, filters) {
  return [
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
      model: model.examinationSessionEligibilityModel,
      as: "examinationSessionEligibilities",
      required: !!filters.status,
      where: eligibilityWhere,
      attributes: ["examinationSessionId", "status", "reviewReason", "academicYearId"],
    },
    {
      model: model.studentHallTicketModel,
      as: "hallTickets",
      required: false,
      where: { examinationSessionId: Number(examinationSessionId) },
      attributes: ["id", "examinationSessionId", "isPublished", "isBlocked", "createdAt"],
    },
  ];
}

function mapStudentRowResult(raw, termIds, termToEstMap) {
  let placementTermId = null;
  let placementTerm = null;

  if (raw.studentClassSectionTerm && termIds.includes(Number(raw.classSectionTermId))) {
    placementTermId = Number(raw.classSectionTermId);
    placementTerm = raw.studentClassSectionTerm.term;
  } else if (raw.sectionHistory && raw.sectionHistory.length > 0) {
    const hist = raw.sectionHistory.find((h) => termIds.includes(Number(h.classSectionTermId)));
    if (hist && hist.classSectionTerm) {
      placementTermId = Number(hist.classSectionTermId);
      placementTerm = hist.classSectionTerm.term;
    }
  }

  const estId = placementTermId ? termToEstMap[placementTermId] : null;

  return {
    student: raw,
    classSectionTerm: { classSectionTermId: placementTermId, term: placementTerm },
    examinationSessionTerm: { examinationSessionTermId: estId, classSectionTermId: placementTermId },
    examinationSession: raw._examSession ?? null,
    mapperSessionId: raw.sessionId ?? null,
  };
}

// -- Examination session --

export async function findExaminationSessionById(examinationSessionId, transaction) {
  return scoped(model.examinationSessionModel).findByPk(examinationSessionId, {
    transaction,
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
        include: [{ model: model.classSectionTermModel, as: "classSectionTerm" }],
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
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
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
  const examSession = await scoped(model.examinationSessionModel).findByPk(examinationSessionId, {
    attributes: ["examinationSessionId", "sessionName", "academicYearId"],
    transaction,
  });

  const isPaginated = filters?.page != null || filters?.limit != null;

  if (!examSession) {
    return isPaginated
      ? { rows: [], total: 0, page: 1, limit: 10, totalPages: 1 }
      : [];
  }

  // Fetch terms for this session.
  const termQueryOptions = {
    where: { examinationSessionId },
    attributes: ["classSectionTermId", "examinationSessionTermId"],
    include: [
      {
        model: model.classSectionTermModel,
        as: "classSectionTerm",
        required: true,
        attributes: ["term"],
      },
    ],
    transaction,
  };

  let filterCombinations = [];
  if (filters.selections && filters.selections.length > 0) {
    const mappingIds = filters.selections.map((s) => s.courseSessionMappingId);
    const dbMappings = await examinationSessionRepository.findSessionCourseMappingsByIds(mappingIds, { transaction });
    const dbMappingsMap = new Map(dbMappings.map((m) => [m.sessionCourseMappingId, m]));

    for (const sel of filters.selections) {
      const mapping = dbMappingsMap.get(sel.courseSessionMappingId);
      if (mapping) {
        filterCombinations.push({
          courseId: mapping.courseId,
          sessionId: mapping.sessionId,
          terms: sel.terms || [],
        });
      }
    }
  }

  // Resolve target terms dynamically
  if (filterCombinations.length > 0) {
    const termsList = Array.from(new Set(filterCombinations.flatMap(c => c.terms)));
    termQueryOptions.include[0].where = {
      term: { [Op.in]: termsList }
    };
  } else if (filters.term != null) {
    termQueryOptions.include[0].where = {
      term: Array.isArray(filters.term) ? { [Op.in]: filters.term } : filters.term,
    };
  }

  const termRows = await scoped(model.examinationSessionTermModel).findAll(termQueryOptions);
  const termIds = termRows.map((r) => Number(r.classSectionTermId));

  if (!termIds.length) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    return isPaginated ? { rows: [], total: 0, page, limit, totalPages: 1 } : [];
  }

  // Map classSectionTermId -> examinationSessionTermId.
  const termToEstMap = {};
  for (const r of termRows) {
    termToEstMap[r.classSectionTermId] = r.examinationSessionTermId;
  }

  const resolvedStudents = await findDistinctStudentIdsByClassSectionTermIds(
    termIds,
    { transaction },
  );
  const historyMatchedRows = resolvedStudents.historyRows;
  const relatedStudentIdSet = resolvedStudents.historyStudentIds;

  const studentWhere = buildStudentFilters(filters, termIds);

  const sessionTermFilter = buildSessionTermFilter(termIds, relatedStudentIdSet);

  const combinedWhere = { [Op.and]: [studentWhere, sessionTermFilter] };

  if (filterCombinations.length > 0) {
    const orClauses = [];
    for (const comb of filterCombinations) {
      const termIdsForComb = [];
      for (const r of termRows) {
        if (
          r.classSectionTerm &&
          comb.terms.includes(r.classSectionTerm.term)
        ) {
          termIdsForComb.push(Number(r.classSectionTermId));
        }
      }

      const historyStudentIdsForComb = [];
      for (const h of historyMatchedRows) {
        if (termIdsForComb.includes(Number(h.classSectionTermId))) {
          historyStudentIdsForComb.push(Number(h.studentId));
        }
      }

      const termOrFilters = [
        { classSectionTermId: { [Op.in]: termIdsForComb } },
      ];
      if (historyStudentIdsForComb.length > 0) {
        termOrFilters.push({
          studentId: { [Op.in]: [...new Set(historyStudentIdsForComb)] },
        });
      }

      orClauses.push({
        courseId: comb.courseId,
        [Op.or]: termOrFilters,
        sessionId: comb.sessionId,
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
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      const valid = filters.status.map((s) => String(s).toUpperCase()).filter((s) => ["READY", "REVIEW", "BLOCKED", "APPROVED"].includes(s));
      if (valid.length > 0) eligibilityWhere.status = { [Op.in]: valid };
    } else {
      const upper = String(filters.status).toUpperCase();
      if (["READY", "REVIEW", "BLOCKED", "APPROVED"].includes(upper)) eligibilityWhere.status = upper;
    }
  }

  const include = buildStudentListIncludes(examinationSessionId, termIds, eligibilityWhere, filters);

  const queryOptions = {
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

  const mappedRows = rows.map((raw) => {
    const mapped = mapStudentRowResult(raw, termIds, termToEstMap);
    mapped.examinationSession = examSessionPlain;
    return mapped;
  });

  if (isPaginated) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    return { rows: mappedRows, total: count, page, limit, totalPages: Math.ceil(count / limit) || 1 };
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
  if (!examinationSessionIds?.length) return new Map();

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

  return new Map(rows.map((row) => [row.examinationSessionId, Number(row.count)]));
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
  return answerSheetQrs.map((a) => a.examScheduleId);
}

export async function getStudentRoomSeatingDetails(studentId, examScheduleIds, transaction) {
  if (!examScheduleIds || !examScheduleIds.length) return new Map();

  const seats = await scoped(model.studentExamSeatModel).findAll({
    where: { studentId },
    include: [
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacity",
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
      roomName: roomCap.classRoom?.roomNumber ?? null,
      roomNumber: roomCap.classRoom?.roomNumber ?? null,
      block: null,
    });
  }
  return seatMap;
}

// -- Eligibility overview --

export async function getEligibilityOverviewCounts(examinationSessionId, filters = {}, transaction = null) {
  const eligibilityWhere = { examinationSessionId: Number(examinationSessionId) };

  const studentWhere = {};
  if (filters.courseId) {
    studentWhere.courseId = Array.isArray(filters.courseId)
      ? { [Op.in]: filters.courseId }
      : Number(filters.courseId);
  }
  if (filters.sessionId) {
    studentWhere.sessionId = Array.isArray(filters.sessionId)
      ? { [Op.in]: filters.sessionId }
      : Number(filters.sessionId);
  }

  const termWhere = {};
  if (filters.term) {
    termWhere.term = Array.isArray(filters.term) ? { [Op.in]: filters.term } : filters.term;
  }

  return scoped(model.examinationSessionEligibilityModel).findAll({
    where: eligibilityWhere,
    attributes: [
      "status",
      [fn("COUNT", col("examination_session_eligibility_id")), "count"],
    ],
    include: [
      {
        model: model.studentModel,
        as: "student",
        required: true,
        where: studentWhere,
        attributes: [],
        include: [
          {
            model: model.classSectionTermModel,
            as: "studentClassSectionTerm",
            required: !!filters.term,
            where: Object.keys(termWhere).length ? termWhere : undefined,
            attributes: [],
          },
        ],
      },
    ],
    group: ["status"],
    raw: true,
    transaction,
  });
}
