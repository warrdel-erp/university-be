import * as examInvigilatorAssignmentRepository from "../repository/examInvigilatorAssignmentRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { decimalAdd } from "../utility/decimalMoney.js";
import { formatDateKey } from "../utility/dateFormat.js";
import { getRoomCentricMetrics } from "../utility/roomCentricHelper.js";

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export async function createAssignment(assignmentData, options = {}) {
  return await sequelize.transaction(async (transaction) => {
    const { userId, examDate, examinationSessionSlotId } = assignmentData;

    const conflict =
      await examInvigilatorAssignmentRepository.checkActiveAssignmentConflict(
        userId,
        examDate,
        examinationSessionSlotId,
        null,
        { ...options, transaction },
      );

    if (conflict) {
      throw createBadRequestError(
        "Invigilator is already assigned to another room during this date and slot.",
      );
    }

    return await examInvigilatorAssignmentRepository.createAssignment(
      assignmentData,
      { ...options, transaction },
    );
  });
}

export async function updateAssignment(id, updateData, options = {}) {
  return await sequelize.transaction(async (transaction) => {
    const assignmentId = Number(id);
    const existing =
      await examInvigilatorAssignmentRepository.getAssignmentById(
        assignmentId,
        { ...options, transaction },
      );

    if (!existing) {
      const error = new Error("Invigilator assignment not found");
      error.statusCode = 404;
      throw error;
    }

    const userId = updateData.userId ?? existing.userId;
    const examDate = updateData.examDate ?? existing.examDate;
    const examinationSessionSlotId =
      updateData.examinationSessionSlotId ?? existing.examinationSessionSlotId;

    const conflict =
      await examInvigilatorAssignmentRepository.checkActiveAssignmentConflict(
        userId,
        examDate,
        examinationSessionSlotId,
        assignmentId,
        { ...options, transaction },
      );

    if (conflict) {
      throw createBadRequestError(
        "Invigilator is already assigned to another room during this date and slot.",
      );
    }

    await examInvigilatorAssignmentRepository.updateAssignment(
      assignmentId,
      updateData,
      { ...options, transaction },
    );

    return await examInvigilatorAssignmentRepository.getAssignmentById(
      assignmentId,
      { ...options, transaction },
    );
  });
}

export async function getAssignmentById(id, options = {}) {
  const record = await examInvigilatorAssignmentRepository.getAssignmentById(
    id,
    options,
  );
  if (!record) {
    const error = new Error("Invigilator assignment not found");
    error.statusCode = 404;
    throw error;
  }
  return record;
}

export async function getAssignments(filters, options = {}) {
  const finalFilters = { ...filters };
  if (filters.examScheduleId) {
    const schedule = await examInvigilatorAssignmentRepository.findScheduleById(
      Number(filters.examScheduleId),
      options,
    );
    if (schedule) {
      finalFilters.examDate = schedule.examDate;
      finalFilters.examinationSessionSlotId = schedule.examinationSessionSlotId;
    }
    delete finalFilters.examScheduleId;
  }
  return examInvigilatorAssignmentRepository.getAssignments(
    finalFilters,
    options,
  );
}

export async function deleteAssignment(id, options = {}) {
  return await sequelize.transaction(async (transaction) => {
    const existing =
      await examInvigilatorAssignmentRepository.getAssignmentById(id, {
        ...options,
        transaction,
      });
    if (!existing) {
      const error = new Error("Invigilator assignment not found");
      error.statusCode = 404;
      throw error;
    }
    await examInvigilatorAssignmentRepository.deleteAssignment(id, {
      ...options,
      transaction,
    });
    return { message: "Invigilator assignment deleted successfully" };
  });
}

export async function getInvigilatorSummary(filters, options = {}) {
  const mappedFilters = {
    ...filters,
    sessionId: filters.sessionId || filters.examinationSessionId,
  };

  const { rows: schedules } =
    await examInvigilatorAssignmentRepository.getSchedulesFiltered(
      mappedFilters,
      { page: 1, limit: 999999 },
      options,
    );
  const scheduleIds = schedules.map((s) => s.examScheduleId);
  if (!scheduleIds.length) {
    return {
      totalRooms: 0,
      readyRooms: 0,
      partialRooms: 0,
      pendingRooms: 0,
      requiredInvigilators: 0,
      assignedInvigilators: 0,
      pendingInvigilators: 0,
    };
  }

  const roomCapacities =
    await examInvigilatorAssignmentRepository.getRoomCapacitiesForSchedules(
      scheduleIds,
      options,
    );
  if (!roomCapacities.length) {
    return {
      totalRooms: 0,
      readyRooms: 0,
      partialRooms: 0,
      pendingRooms: 0,
      requiredInvigilators: 0,
      assignedInvigilators: 0,
      pendingInvigilators: 0,
    };
  }
  const scheduleMap = new Map(schedules.map((s) => [s.examScheduleId, s]));

  const physicalRooms = new Map();
  for (const rc of roomCapacities) {
    const sched = scheduleMap.get(rc.examScheduleId);
    if (!sched) continue;
    const key = `${formatDateKey(sched.examDate)}_${sched.examinationSessionSlotId}_${rc.classRoomSectionId}`;
    if (!physicalRooms.has(key)) {
      physicalRooms.set(key, {
        classRoomSectionId: rc.classRoomSectionId,
        examDate: sched.examDate,
        examinationSessionSlotId: sched.examinationSessionSlotId,
      });
    }
  }

  const classRoomSectionIds = [
    ...new Set(roomCapacities.map((rc) => rc.classRoomSectionId)),
  ];
  const examDates = [...new Set(schedules.map((s) => s.examDate))];
  const slotIds = [
    ...new Set(schedules.map((s) => s.examinationSessionSlotId)),
  ];

  const assignments =
    await examInvigilatorAssignmentRepository.getAssignmentsForRooms(
      classRoomSectionIds,
      examDates,
      slotIds,
      options,
    );

  const assignmentsMap = new Map();
  for (const ass of assignments) {
    const key = `${formatDateKey(ass.examDate)}_${ass.examinationSessionSlotId}_${ass.classRoomSectionId}`;
    if (!assignmentsMap.has(key)) {
      assignmentsMap.set(key, []);
    }
    assignmentsMap.get(key).push(ass);
  }

  let totalRooms = physicalRooms.size;
  let readyRooms = 0;
  let partialRooms = 0;
  let pendingRooms = 0;
  let assignedInvigilators = 0;

  const requiredPerRoom = 2;

  let pendingInvigilators = 0;
  for (const [key, room] of physicalRooms.entries()) {
    const roomAssignments = assignmentsMap.get(key) || [];
    const assignedCount = roomAssignments.length;
    assignedInvigilators = decimalAdd(assignedInvigilators, assignedCount);
    pendingInvigilators = decimalAdd(
      pendingInvigilators,
      Math.max(0, requiredPerRoom - assignedCount),
    );

    if (assignedCount >= requiredPerRoom) {
      readyRooms++;
    } else if (assignedCount > 0) {
      partialRooms++;
    } else {
      pendingRooms++;
    }
  }

  const requiredInvigilators = totalRooms * requiredPerRoom;

  return {
    totalRooms,
    readyRooms,
    partialRooms,
    pendingRooms,
    requiredInvigilators,
    assignedInvigilators,
    pendingInvigilators,
  };
}

export async function getAssignmentsByUserId(
  userId,
  examinationSessionId,
  options = {},
) {
  return examInvigilatorAssignmentRepository.getAssignmentsByUserId(
    userId,
    examinationSessionId,
    options,
  );
}

export async function getAssignmentsByRoom(
  classRoomSectionId,
  filters,
  options = {},
) {
  const roomCapacities =
    await examInvigilatorAssignmentRepository.getRoomCapacitiesByRoom(
      classRoomSectionId,
      filters,
      options,
    );

  const results = [];
  for (const rc of roomCapacities) {
    const metrics = await getRoomCentricMetrics(
      rc.examScheduleId,
      classRoomSectionId,
    );

    // Fetch invigilators assigned to this room at this slot/date
    const invigilators =
      await examInvigilatorAssignmentRepository.getAssignmentsForRooms(
        [Number(classRoomSectionId)],
        [rc.examSchedule.examDate],
        [rc.examSchedule.examinationSessionSlotId],
        options,
      );

    results.push({
      examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
      examScheduleId: rc.examScheduleId,
      examDate: rc.examSchedule.examDate,
      term: rc.examSchedule.term,
      sessionId: rc.examSchedule.sessionId,
      examinationSessionSlotId: rc.examSchedule.examinationSessionSlotId,
      subjectId: rc.examSchedule.subjectSchedule?.subjectId,
      subjectName: rc.examSchedule.subjectSchedule?.subjectName,
      subjectCode: rc.examSchedule.subjectSchedule?.subjectCode,
      courseId: rc.examSchedule.subjectSchedule?.courseId,
      slot: rc.examSchedule.examinationSessionSlot
        ? {
            examinationSessionSlotId:
              rc.examSchedule.examinationSessionSlot.examinationSessionSlotId,
            slotNumber: rc.examSchedule.examinationSessionSlot.slotNumber,
            startTime: rc.examSchedule.examinationSessionSlot.startTime,
            endTime: rc.examSchedule.examinationSessionSlot.endTime,
          }
        : null,
      roomNumber: rc.classRoom?.roomNumber,
      capacity: rc.capacity,
      invigilators: invigilators.map((inv) => ({
        userId: inv.user ? inv.user.userId : inv.userId,
        userName: inv.user ? inv.user.userName : "",
        role: inv.role,
      })),
      roomDetails: metrics,
    });
  }

  return results;
}

export async function getFacultyAvailability(examScheduleId, options = {}) {
  const schedule = await examInvigilatorAssignmentRepository.findScheduleById(
    examScheduleId,
    options,
  );
  if (!schedule) {
    const err = new Error("Exam schedule not found");
    err.statusCode = 404;
    throw err;
  }

  const { examDate, examinationSessionSlotId } = schedule;

  const [activeAssignments, allEmployees] = await Promise.all([
    examInvigilatorAssignmentRepository.getAssignmentsByDateAndSlot(
      examDate,
      examinationSessionSlotId,
      options,
    ),
    examInvigilatorAssignmentRepository.getAllEmployeesWithUser(options),
  ]);

  const assignedUserIds = new Set(activeAssignments.map((a) => a.userId));

  const available = [];
  const reserved = [];

  for (const emp of allEmployees) {
    if (!emp.user) continue;
    const userData = {
      userId: emp.user.userId,
      userName: emp.user.userName,
      email: emp.user.email,
      employeeId: emp.employeeId,
    };

    if (assignedUserIds.has(emp.userId)) {
      reserved.push(userData);
    } else {
      available.push(userData);
    }
  }

  return {
    available,
    reserved,
  };
}

export async function getRoomAssignmentDetail(
  examScheduleId,
  classRoomSectionId,
  options = {},
) {
  const schedule = await examInvigilatorAssignmentRepository.findScheduleById(
    examScheduleId,
    options,
  );
  if (!schedule) {
    const error = new Error("Exam schedule not found");
    error.statusCode = 404;
    throw error;
  }

  const roomCapacity =
    await examInvigilatorAssignmentRepository.findRoomCapacityByScheduleAndSection(
      examScheduleId,
      classRoomSectionId,
      options,
    );
  if (!roomCapacity) {
    const error = new Error(
      "Room capacity not found for this schedule and section",
    );
    error.statusCode = 404;
    throw error;
  }

  const [assignments, duplicateChecks, seatCounts] = await Promise.all([
    examInvigilatorAssignmentRepository.getAssignmentsForRooms(
      [classRoomSectionId],
      [formatDateKey(schedule.examDate)],
      [schedule.examinationSessionSlotId],
      options,
    ),
    examInvigilatorAssignmentRepository.getDuplicateChecks(
      [classRoomSectionId],
      [formatDateKey(schedule.examDate)],
      [schedule.examinationSessionSlotId],
      options,
    ),
    examInvigilatorAssignmentRepository.getSeatCounts(
      [roomCapacity.examScheduleRoomCapacityId],
      options,
    ),
  ]);

  const seatCount = seatCounts[0]
    ? parseInt(seatCounts[0].studentCount, 10) || 0
    : 0;
  const duplicateExam = duplicateChecks[0]
    ? (parseInt(duplicateChecks[0].scheduleCount, 10) || 0) > 1
    : false;

  const plainRoom = roomCapacity.get({ plain: true });
  plainRoom.studentCount = seatCount;
  plainRoom.duplicateExam = duplicateExam;
  plainRoom.examInvigilatorAssignments = assignments || [];
  plainRoom.totalInvigilators = assignments.length;
  plainRoom.invigilatorRequired = 2;

  return plainRoom;
}

/**
 * Room-centric list: returns unique rooms, each carrying all exam schedules
 * (with subject, term, courseId, sessionId) assigned to that room.
 * Filters: examinationSessionId (required), examDate (optional).
 */

export async function getListOfRoomsRoomWise(
  filters,
  pagination,
  options = {},
) {
  const { page = 1, limit = 10 } = pagination;

  // Fetch all room-capacity rows matching the filters
  const allRows = await examInvigilatorAssignmentRepository.getRoomsWithExams(
    filters,
    options,
  );

  // Fetch assignments to calculate count and status
  const classRoomSectionIds = [
    ...new Set(allRows.map((rc) => rc.classRoomSectionId)),
  ];
  const examDates = [
    ...new Set(allRows.map((rc) => rc.examSchedule?.examDate)),
  ].filter(Boolean);
  const slotIds = [
    ...new Set(allRows.map((rc) => rc.examSchedule?.examinationSessionSlotId)),
  ].filter(Boolean);

  const assignments =
    classRoomSectionIds.length && examDates.length && slotIds.length
      ? await examInvigilatorAssignmentRepository.getAssignmentsForRooms(
          classRoomSectionIds,
          examDates,
          slotIds,
          options,
        )
      : [];

  const assignmentsMap = new Map();
  for (const ass of assignments) {
    const key = `${formatDateKey(ass.examDate)}_${ass.examinationSessionSlotId}_${ass.classRoomSectionId}`;
    if (!assignmentsMap.has(key)) {
      assignmentsMap.set(key, []);
    }
    assignmentsMap.get(key).push(ass);
  }

  // Group by classRoomSectionId + examDate + examinationSessionSlotId
  const roomMap = new Map();

  for (const rc of allRows) {
    const roomId = rc.classRoomSectionId;
    const schedule = rc.examSchedule;
    const subject = schedule?.subjectSchedule;
    const slot = schedule?.examinationSessionSlot;

    const examDate = schedule?.examDate;
    const slotId = schedule?.examinationSessionSlotId;
    const examDateStr = formatDateKey(examDate);
    const key = `${roomId}_${examDateStr}_${slotId}`;

    const assKey = `${examDateStr}_${slotId}_${roomId}`;
    const roomAssignments = assignmentsMap.get(assKey) || [];
    const assignedCount = roomAssignments.length;

    let invigilatorStatus = "PENDING";
    if (assignedCount >= 2) {
      invigilatorStatus = "READY";
    } else if (assignedCount > 0) {
      invigilatorStatus = "PARTIAL";
    }

    if (!roomMap.has(key)) {
      roomMap.set(key, {
        classRoomSectionId: roomId,
        roomNumber: rc.classRoom?.roomNumber,
        roomCapacity: rc.classRoom?.capacity,
        examCapacity: rc.classRoom?.examCapacity,
        examDate,
        slot: slot
          ? {
              examinationSessionSlotId: slot.examinationSessionSlotId,
              slotNumber: slot.slotNumber,
              startTime: slot.startTime,
              endTime: slot.endTime,
            }
          : null,
        invigilatorCount: assignedCount,
        invigilatorStatus,
        exams: [],
      });
    }

    roomMap.get(key).exams.push({
      examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
      examScheduleId: schedule?.examScheduleId,
      term: schedule?.term,
      sessionId: schedule?.sessionId,
      subjectId: subject?.subjectId,
      subjectName: subject?.subjectName,
      subjectCode: subject?.subjectCode,
      courseId: subject?.courseId,
      capacity: rc.capacity,
    });
  }

  // Convert map to array
  const allUniqueRooms = Array.from(roomMap.values());

  // Paginate at the unique-room level
  const total = allUniqueRooms.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const paginatedRooms = allUniqueRooms.slice(offset, offset + limitNum);

  return {
    rooms: paginatedRooms,
    total,
    page: pageNum,
    limit: limitNum,
  };
}
