import * as examInvigilatorAssignmentRepository from "../repository/examInvigilatorAssignmentRepository.js";
import sequelize from "../database/sequelizeConfig.js";

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
  return examInvigilatorAssignmentRepository.getAssignments(
    filters,
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
  const duplicateMap = new Map(duplicateChecks.map((r) => [`${r.classRoomSectionId}_${r.examDate}_${Number(r.examinationSessionSlotId)}`, (parseInt(r.scheduleCount, 10) || 0) > 1]));

  const assignmentsMap = new Map();
  for (const r of assignments) {
    const key = `${r.classRoomSectionId}_${r.examDate}_${Number(r.examinationSessionSlotId)}`;
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
    const roomAssKey = `${rc.classRoomSectionId}_${schedule.examDate}_${Number(schedule.examinationSessionSlotId)}`;

    rc.setDataValue("studentCount", seatCountMap.get(rc.examScheduleRoomCapacityId) || 0);
    rc.setDataValue("duplicateExam", duplicateMap.get(roomAssKey) || false);
    rc.setDataValue("examInvigilatorAssignments", assignmentsMap.get(roomAssKey) || []);

    capacitiesMap.get(rc.examScheduleId).push(rc);
  }

  for (const schedule of schedules) {
    const capacities = capacitiesMap.get(schedule.examScheduleId) || [];
    const assignedCount = capacities.reduce((sum, rc) => sum + rc.getDataValue("examInvigilatorAssignments").length, 0);
    const capacitySum = capacities.reduce((sum, rc) => sum + rc.capacity, 0);
    const studentsSum = capacities.reduce((sum, rc) => sum + rc.getDataValue("studentCount"), 0);

    const requiredCount = capacities.length * 2;
    const status = assignedCount >= requiredCount ? "ASSIGNED" : assignedCount > 0 ? "PARTIAL" : "PENDING";

    schedule.setDataValue("examScheduleRoomCapacities", capacities);
    schedule.setDataValue("summary", {
      totalRooms: capacities.length,
      totalRoomCapacitySum: capacitySum,
      studentCount: studentsSum,
      requiredInvigilatorCount: requiredCount,
      assignedInvigilatorCount: assignedCount,
      pendingInvigilatorCount: Math.max(0, requiredCount - assignedCount),
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
  const result = await getListOfRooms(filters, { page: 1, limit: 999999 }, options);
  const list = result.rooms;

  let totalRooms = 0, readyRooms = 0, partialRooms = 0, requiredInvigilators = 0, assignedInvigilators = 0;

  for (const item of list) {
    const summary = item.getDataValue("summary") || {};
    totalRooms += summary.totalRooms || 0;
    requiredInvigilators += summary.requiredInvigilatorCount || 0;
    assignedInvigilators += summary.assignedInvigilatorCount || 0;

    const capacities = item.getDataValue("examScheduleRoomCapacities") || [];
    for (const rc of capacities) {
      const assignedCount = (rc.getDataValue("examInvigilatorAssignments") || []).length;
      if (assignedCount >= 2) readyRooms++;
      else if (assignedCount > 0) partialRooms++;
    }
  }

  return {
    totalRooms,
    readyRooms,
    partialRooms,
    requiredInvigilators,
    assignedInvigilators,
    pendingInvigilators: Math.max(0, requiredInvigilators - assignedInvigilators),
  };
}

export async function getAssignmentsByUserId(userId, examinationSessionId, options = {}) {
  return examInvigilatorAssignmentRepository.getAssignmentsByUserId(userId, examinationSessionId, options);
}

export async function getAssignmentsByExamScheduleId(examScheduleId, options = {}) {
  return examInvigilatorAssignmentRepository.getAssignmentsByExamScheduleId(examScheduleId, options);
}

export async function getFacultyAvailability(examScheduleId, options = {}) {
  const schedule = await examInvigilatorAssignmentRepository.getAssignmentsByExamScheduleId(examScheduleId, options);
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
