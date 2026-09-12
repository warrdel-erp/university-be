import { Op } from "sequelize";
import * as examOperationsRepository from "../repository/examOperationsRepository.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import { formatDateKey } from "../utility/dateFormat.js";

function operationKey(classRoomSectionId, examDate, examinationSessionSlotId) {
  return `${Number(classRoomSectionId)}_${formatDateKey(examDate)}_${Number(examinationSessionSlotId)}`;
}

function toPlain(row) {
  return row.get ? row.get({ plain: true }) : row;
}

function mapInvigilator(row) {
  const plain = toPlain(row);
  return {
    examInvigilatorAssignmentId: plain.examInvigilatorAssignmentId,
    userId: plain.user.userId,
    userName: plain.user.userName,
    role: plain.role,
  };
}

function mapMaterialBundle(row) {
  const plain = toPlain(row);
  const materialItems = [];
  for (const item of plain.items) {
    materialItems.push({
      examRoomMaterialItemId: item.examRoomMaterialItemId,
      itemType: item.itemType,
      plannedQuantity: item.plannedQuantity,
      issuedQuantity: item.issuedQuantity,
      usedQuantity: item.usedQuantity,
      unusedQuantity: item.unusedQuantity,
      returnedQuantity: item.returnedQuantity,
      damagedQuantity: item.damagedQuantity,
      remarks: item.remarks,
    });
  }

  return {
    examRoomMaterialBundleId: plain.examRoomMaterialBundleId,
    bundleCode: plain.bundleCode,
    status: plain.status,
    issuedTo: plain.recipientUser
      ? {
          userId: plain.recipientUser.userId,
          userName: plain.recipientUser.userName,
        }
      : null,
    issuedBy: plain.issuerUser
      ? {
          userId: plain.issuerUser.userId,
          userName: plain.issuerUser.userName,
        }
      : null,
    issuedAt: plain.issuedAt,
    receivedAt: plain.receivedAt,
    verifiedAt: plain.verifiedAt,
    remarks: plain.remarks,
    materialItems,
  };
}

function operationStatus(invigilators, materialBundle) {
  if (invigilators.length > 0 && materialBundle != null) {
    return "READY_FOR_EXAM";
  }
  return "NOT_READY";
}

/** Resolve query filters → scheduleWhere / subjectWhere for repository queries. */
async function resolveScheduleFilters(query) {
  const scheduleWhere = {
    examinationSessionId: Number(query.examinationSessionId),
  };
  if (query.examDate) {
    scheduleWhere.examDate = query.examDate;
  }

  const subjectWhere = {};

  if (!query.selections?.length) {
    return { scheduleWhere, subjectWhere };
  }

  const mappingIds = [];
  for (const sel of query.selections) {
    mappingIds.push(sel.courseSessionMappingId);
  }

  const dbMappings =
    await examinationSessionRepository.findSessionCourseMappingsByIds(
      mappingIds,
    );
  const dbMappingsMap = new Map();
  for (const mapping of dbMappings) {
    dbMappingsMap.set(Number(mapping.sessionCourseMappingId), mapping);
  }

  const filterCombinations = [];
  for (const sel of query.selections) {
    const mapping = dbMappingsMap.get(Number(sel.courseSessionMappingId));
    if (!mapping) continue;
    filterCombinations.push({
      courseId: Number(mapping.courseId),
      sessionId: Number(mapping.sessionId),
      terms: sel.terms,
    });
  }

  if (!filterCombinations.length) {
    return { scheduleWhere, subjectWhere };
  }

  const sessionIds = [];
  const orSubjects = [];
  for (const comb of filterCombinations) {
    sessionIds.push(comb.sessionId);
    orSubjects.push({
      courseId: comb.courseId,
      term: { [Op.in]: comb.terms },
    });
  }

  const uniqueSessionIds = [...new Set(sessionIds)];
  scheduleWhere.sessionId =
    uniqueSessionIds.length === 1
      ? uniqueSessionIds[0]
      : { [Op.in]: uniqueSessionIds };
  subjectWhere[Op.or] = orSubjects;

  return { scheduleWhere, subjectWhere };
}

/**
 * Room-wise exam operations for an examination session.
 * Top-level: one entry per classRoomSectionId.
 * operations[]: one entry per examDate + examinationSessionSlotId.
 * status READY_FOR_EXAM when invigilators and materialBundle both exist.
 * Optional query.status filters operations (and rooms with no matching ops).
 */
export async function listRooms(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;
  const statusFilter = query.status;

  const { scheduleWhere, subjectWhere } = await resolveScheduleFilters(query);

  // Status is derived after merge — load all rooms, filter, then paginate.
  const roomPagination = statusFilter ? {} : { limit, offset };

  const roomRows = await examOperationsRepository.findPaginatedRooms(
    scheduleWhere,
    subjectWhere,
    roomPagination,
  );

  if (!roomRows.length && !statusFilter) {
    const total = await examOperationsRepository.countDistinctRooms(
      scheduleWhere,
      subjectWhere,
    );
    return {
      rows: [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  if (!roomRows.length) {
    return {
      rows: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const classRoomSectionIds = [];
  const roomMetaById = new Map();
  for (const room of roomRows) {
    const classRoomSectionId = Number(room.classRoomSectionId);
    classRoomSectionIds.push(classRoomSectionId);
    roomMetaById.set(classRoomSectionId, {
      classRoomSectionId,
      roomNumber: room.roomNumber,
      roomCapacity: room.roomCapacity,
    });
  }

  const capacityRows =
    await examOperationsRepository.findRoomCapacitiesForRooms(
      scheduleWhere,
      subjectWhere,
      classRoomSectionIds,
    );

  const examDates = [];
  const slotIds = [];
  const capacityIds = [];
  const dateSeen = new Set();
  const slotSeen = new Set();

  for (const row of capacityRows) {
    const plain = toPlain(row);
    const schedule = plain.examSchedule;
    capacityIds.push(Number(plain.examScheduleRoomCapacityId));

    const examDate = formatDateKey(schedule.examDate);
    if (!dateSeen.has(examDate)) {
      dateSeen.add(examDate);
      examDates.push(examDate);
    }

    const slotId = Number(schedule.examinationSessionSlotId);
    if (!slotSeen.has(slotId)) {
      slotSeen.add(slotId);
      slotIds.push(slotId);
    }
  }

  const [invigilators, bundles, seatCountRows] = await Promise.all([
    examOperationsRepository.findInvigilatorsForRooms(
      classRoomSectionIds,
      examDates,
      slotIds,
    ),
    examOperationsRepository.findMaterialBundlesForRooms(
      classRoomSectionIds,
      examDates,
      slotIds,
    ),
    examOperationsRepository.findSeatCountsByCapacityIds(capacityIds),
  ]);

  const seatCountMap = new Map();
  for (const row of seatCountRows) {
    seatCountMap.set(
      Number(row.examScheduleRoomCapacityId),
      Number(row.studentCount) || 0,
    );
  }

  const invigilatorsByOp = new Map();
  for (const row of invigilators) {
    const plain = toPlain(row);
    const key = operationKey(
      plain.classRoomSectionId,
      plain.examDate,
      plain.examinationSessionSlotId,
    );
    if (!invigilatorsByOp.has(key)) invigilatorsByOp.set(key, []);
    invigilatorsByOp.get(key).push(mapInvigilator(plain));
  }

  const bundleByOp = new Map();
  for (const row of bundles) {
    const plain = toPlain(row);
    const key = operationKey(
      plain.classRoomSectionId,
      plain.examDate,
      plain.examinationSessionSlotId,
    );
    if (!bundleByOp.has(key)) {
      bundleByOp.set(key, mapMaterialBundle(plain));
    }
  }

  const roomsOrder = [];
  const roomOpsMap = new Map();

  for (const classRoomSectionId of classRoomSectionIds) {
    roomsOrder.push(classRoomSectionId);
    roomOpsMap.set(classRoomSectionId, new Map());
  }

  for (const row of capacityRows) {
    const plain = toPlain(row);
    const schedule = plain.examSchedule;
    const subject = schedule.subjectSchedule;
    const slot = schedule.examinationSessionSlot;
    const classRoomSectionId = Number(plain.classRoomSectionId);
    const examScheduleRoomCapacityId = Number(plain.examScheduleRoomCapacityId);
    const examDate = formatDateKey(schedule.examDate);
    const opKey = operationKey(
      classRoomSectionId,
      examDate,
      schedule.examinationSessionSlotId,
    );

    const ops = roomOpsMap.get(classRoomSectionId);

    if (!ops.has(opKey)) {
      ops.set(opKey, {
        examDate,
        slot: {
          examinationSessionSlotId: Number(slot.examinationSessionSlotId),
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        exams: [],
      });
    }

    ops.get(opKey).exams.push({
      examScheduleRoomCapacityId,
      examScheduleId: Number(schedule.examScheduleId),
      subjectId: Number(subject.subjectId),
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      courseId: Number(subject.courseId),
      sessionId: Number(schedule.sessionId),
      term: schedule.term == null ? null : Number(schedule.term),
      capacity: Number(plain.capacity),
      studentCount: seatCountMap.get(examScheduleRoomCapacityId) || 0,
    });
  }

  const allRows = [];
  for (const classRoomSectionId of roomsOrder) {
    const meta = roomMetaById.get(classRoomSectionId);
    const ops = roomOpsMap.get(classRoomSectionId);
    const operations = [];

    for (const operation of ops.values()) {
      const opKey = operationKey(
        classRoomSectionId,
        operation.examDate,
        operation.slot.examinationSessionSlotId,
      );

      const opInvigilators = invigilatorsByOp.get(opKey) || [];
      const materialBundle = bundleByOp.get(opKey) || null;
      const status = operationStatus(opInvigilators, materialBundle);

      if (statusFilter && status !== statusFilter) continue;

      operations.push({
        examDate: operation.examDate,
        slot: operation.slot,
        status,
        exams: operation.exams,
        invigilators: opInvigilators,
        materialBundle,
      });
    }

    if (!operations.length) continue;

    allRows.push({
      classRoomSectionId,
      roomNumber: meta.roomNumber,
      roomCapacity: meta.roomCapacity,
      operations,
    });
  }

  if (statusFilter) {
    const total = allRows.length;
    return {
      rows: allRows.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  const total = await examOperationsRepository.countDistinctRooms(
    scheduleWhere,
    subjectWhere,
  );

  return {
    rows: allRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}
