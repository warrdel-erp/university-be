import * as examInvigilatorAssignmentRepository from "../repository/examInvigilatorAssignmentRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { decimalAdd } from "../utility/decimalMoney.js";
import { formatDateKey } from "../utility/dateFormat.js";

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
    const schedule = await examInvigilatorAssignmentRepository.findScheduleById(Number(filters.examScheduleId), options);
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

export async function getListOfRooms(filters, pagination, options = {}) {
  const { page = 1, limit = 10 } = pagination;

  const { rows: schedules, count: totalSchedules } =
    await examInvigilatorAssignmentRepository.getSchedulesFiltered(
      filters,
      pagination,
      options,
    );

  const scheduleIds = schedules.map((s) => s.examScheduleId);
  if (!scheduleIds.length) {
    return { rooms: [], total: 0, page: Number(page), limit: Number(limit) };
  }

  const roomCapacities =
    await examInvigilatorAssignmentRepository.getRoomCapacitiesForSchedules(
      scheduleIds,
      options,
    );

  const classRoomSectionIds = [...new Set(roomCapacities.map((rc) => rc.classRoomSectionId))];
  const roomCapacityIds = roomCapacities.map((rc) => rc.examScheduleRoomCapacityId);
  const examDates = [...new Set(schedules.map((s) => s.examDate))];
  const slotIds = [...new Set(schedules.map((s) => s.examinationSessionSlotId))];

  const [assignments, duplicateChecks, seatCounts] = await Promise.all([
    classRoomSectionIds.length ? examInvigilatorAssignmentRepository.getAssignmentsForRooms(classRoomSectionIds, examDates, slotIds, options) : [],
    classRoomSectionIds.length ? examInvigilatorAssignmentRepository.getDuplicateChecks(classRoomSectionIds, examDates, slotIds, options) : [],
    roomCapacityIds.length ? examInvigilatorAssignmentRepository.getSeatCounts(roomCapacityIds, options) : [],
  ]);
  const seatCountMap = new Map(seatCounts.map((r) => [r.examScheduleRoomCapacityId, parseInt(r.studentCount, 10) || 0]));
  const duplicateMap = new Map(duplicateChecks.map((r) => [`${r.classRoomSectionId}_${formatDateKey(r.examDate)}_${Number(r.examinationSessionSlotId)}`, (parseInt(r.scheduleCount, 10) || 0) > 1]));

  const assignmentsMap = new Map();
  for (const r of assignments) {
    const key = `${r.classRoomSectionId}_${formatDateKey(r.examDate)}_${Number(r.examinationSessionSlotId)}`;
    if (!assignmentsMap.has(key)) assignmentsMap.set(key, []);
    assignmentsMap.get(key).push(r);
  }

  const scheduleMap = new Map(schedules.map(s => [s.examScheduleId, s]));
  const capacitiesMap = new Map();

  for (const rc of roomCapacities) {
    if (!capacitiesMap.has(rc.examScheduleId)) {
      capacitiesMap.set(rc.examScheduleId, []);
    }
    const schedule = scheduleMap.get(rc.examScheduleId);
    const roomAssKey = `${rc.classRoomSectionId}_${formatDateKey(schedule.examDate)}_${Number(schedule.examinationSessionSlotId)}`;

    rc.setDataValue("studentCount", seatCountMap.get(rc.examScheduleRoomCapacityId) || 0);
    rc.setDataValue("duplicateExam", duplicateMap.get(roomAssKey) || false);
    rc.setDataValue("examInvigilatorAssignments", assignmentsMap.get(roomAssKey) || []);

    capacitiesMap.get(rc.examScheduleId).push(rc);
  }

  for (const schedule of schedules) {
    const capacities = capacitiesMap.get(schedule.examScheduleId) || [];
    const assignedCount = capacities.reduce((sum, rc) => decimalAdd(sum, rc.getDataValue("examInvigilatorAssignments").length), 0);
    const capacitySum = capacities.reduce((sum, rc) => decimalAdd(sum, rc.capacity || 0), 0);
    const studentsSum = capacities.reduce((sum, rc) => decimalAdd(sum, rc.getDataValue("studentCount") || 0), 0);

    const requiredCount = capacities.length * 2;
    let pendingCountSum = 0;
    for (const rc of capacities) {
      const assignedToRoom = rc.getDataValue("examInvigilatorAssignments").length;
      pendingCountSum = decimalAdd(pendingCountSum, Math.max(0, 2 - assignedToRoom));
    }
    const status = pendingCountSum === 0 ? "ASSIGNED" : assignedCount > 0 ? "PARTIAL" : "PENDING";

    schedule.setDataValue("examScheduleRoomCapacities", capacities);
    schedule.setDataValue("summary", {
      totalRooms: capacities.length,
      totalRoomCapacitySum: capacitySum,
      studentCount: studentsSum,
      requiredInvigilatorCount: requiredCount,
      assignedInvigilatorCount: assignedCount,
      pendingInvigilatorCount: pendingCountSum,
      status,
    });
  }

  return {
    rooms: schedules,
    total: totalSchedules,
    page: Number(page),
    limit: Number(limit),
  };
}

export async function getInvigilatorSummary(filters, options = {}) {
  const mappedFilters = {
    ...filters,
    sessionId: filters.sessionId || filters.examinationSessionId,
  };

  const { rows: schedules } = await examInvigilatorAssignmentRepository.getSchedulesFiltered(mappedFilters, { page: 1, limit: 999999 }, options);
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

  const roomCapacities = await examInvigilatorAssignmentRepository.getRoomCapacitiesForSchedules(scheduleIds, options);
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

  const classRoomSectionIds = [...new Set(roomCapacities.map((rc) => rc.classRoomSectionId))];
  const examDates = [...new Set(schedules.map((s) => s.examDate))];
  const slotIds = [...new Set(schedules.map((s) => s.examinationSessionSlotId))];

  const assignments = await examInvigilatorAssignmentRepository.getAssignmentsForRooms(classRoomSectionIds, examDates, slotIds, options);

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
    pendingInvigilators = decimalAdd(pendingInvigilators, Math.max(0, requiredPerRoom - assignedCount));

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

export async function getAssignmentsByUserId(userId, examinationSessionId, options = {}) {
  return examInvigilatorAssignmentRepository.getAssignmentsByUserId(userId, examinationSessionId, options);
}

export async function getAssignmentsByExamScheduleId(examScheduleId, options = {}) {
  const parsedId = Number(examScheduleId);
  if (isNaN(parsedId)) return null;

  const schedule = await examInvigilatorAssignmentRepository.findScheduleById(parsedId, options);
  if (!schedule) return null;

  const roomCapacities = await examInvigilatorAssignmentRepository.findRoomCapacitiesBySchedule(parsedId, options);

  const classRoomSectionIds = roomCapacities.map((rc) => rc.classRoomSectionId);
  const roomCapacityIds = roomCapacities.map((rc) => rc.examScheduleRoomCapacityId);

  const [assignments, seatCounts] = await Promise.all([
    classRoomSectionIds.length
      ? examInvigilatorAssignmentRepository.getAssignmentsForRooms(
          classRoomSectionIds,
          [schedule.examDate],
          [schedule.examinationSessionSlotId],
          options,
        )
      : [],
    roomCapacityIds.length
      ? examInvigilatorAssignmentRepository.getSeatCounts(roomCapacityIds, options)
      : [],
  ]);

  const assignmentsMap = new Map();
  for (const row of assignments) {
    const key = row.classRoomSectionId;
    if (!assignmentsMap.has(key)) {
      assignmentsMap.set(key, []);
    }
    assignmentsMap.get(key).push(row);
  }

  const seatCountMap = new Map(
    seatCounts.map((r) => [r.examScheduleRoomCapacityId, parseInt(r.studentCount, 10) || 0]),
  );

  let totalRoomCapacitySum = 0;
  let studentCountSum = 0;
  let assignedInvigilatorCount = 0;
  let pendingInvigilatorCount = 0;

  for (const rc of roomCapacities) {
    const roomAssignments = assignmentsMap.get(rc.classRoomSectionId) || [];
    const studentCount = seatCountMap.get(rc.examScheduleRoomCapacityId) || 0;

    totalRoomCapacitySum = decimalAdd(totalRoomCapacitySum, rc.capacity || 0);
    studentCountSum = decimalAdd(studentCountSum, studentCount);
    assignedInvigilatorCount = decimalAdd(assignedInvigilatorCount, roomAssignments.length);
    pendingInvigilatorCount = decimalAdd(pendingInvigilatorCount, Math.max(0, 2 - roomAssignments.length));

    rc.setDataValue("studentCount", studentCount);
    rc.setDataValue("examInvigilatorAssignments", roomAssignments);
    rc.setDataValue("totalInvigilators", roomAssignments.length);
    rc.setDataValue("invigilatorRequired", 2);
  }

  const totalRooms = roomCapacities.length;
  const requiredInvigilatorCount = totalRooms * 2;

  let status = "PENDING";
  if (pendingInvigilatorCount === 0) {
    status = "ASSIGNED";
  } else if (assignedInvigilatorCount > 0) {
    status = "PARTIAL";
  }

  schedule.setDataValue("examScheduleRoomCapacities", roomCapacities);
  schedule.setDataValue("summary", {
    totalRooms,
    totalRoomCapacitySum,
    studentCount: studentCountSum,
    requiredInvigilatorCount,
    assignedInvigilatorCount,
    pendingInvigilatorCount,
    status,
  });

  return schedule;
}

export async function getFacultyAvailability(examScheduleId, options = {}) {
  const schedule = await examInvigilatorAssignmentRepository.findScheduleById(examScheduleId, options);
  if (!schedule) {
    const err = new Error("Exam schedule not found");
    err.statusCode = 404;
    throw err;
  }

  const { examDate, examinationSessionSlotId } = schedule;

  const [activeAssignments, allEmployees] = await Promise.all([
    examInvigilatorAssignmentRepository.getAssignmentsByDateAndSlot(examDate, examinationSessionSlotId, options),
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

export async function getRoomAssignmentDetail(examScheduleId, classRoomSectionId, options = {}) {
  const schedule = await examInvigilatorAssignmentRepository.findScheduleById(examScheduleId, options);
  if (!schedule) {
    const error = new Error("Exam schedule not found");
    error.statusCode = 404;
    throw error;
  }

  const roomCapacity = await examInvigilatorAssignmentRepository.findRoomCapacityByScheduleAndSection(examScheduleId, classRoomSectionId, options);
  if (!roomCapacity) {
    const error = new Error("Room capacity not found for this schedule and section");
    error.statusCode = 404;
    throw error;
  }

  const [assignments, duplicateChecks, seatCounts] = await Promise.all([
    examInvigilatorAssignmentRepository.getAssignmentsForRooms([classRoomSectionId], [formatDateKey(schedule.examDate)], [schedule.examinationSessionSlotId], options),
    examInvigilatorAssignmentRepository.getDuplicateChecks([classRoomSectionId], [formatDateKey(schedule.examDate)], [schedule.examinationSessionSlotId], options),
    examInvigilatorAssignmentRepository.getSeatCounts([roomCapacity.examScheduleRoomCapacityId], options)
  ]);

  const seatCount = seatCounts[0] ? parseInt(seatCounts[0].studentCount, 10) || 0 : 0;
  const duplicateExam = duplicateChecks[0] ? (parseInt(duplicateChecks[0].scheduleCount, 10) || 0) > 1 : false;

  const plainRoom = roomCapacity.get({ plain: true });
  plainRoom.studentCount = seatCount;
  plainRoom.duplicateExam = duplicateExam;
  plainRoom.examInvigilatorAssignments = assignments || [];
  plainRoom.totalInvigilators = assignments.length;
  plainRoom.invigilatorRequired = 2;

  return plainRoom;
}
