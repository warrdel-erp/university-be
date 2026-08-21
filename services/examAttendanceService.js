import * as examAttendanceRepository from "../repository/examAttendanceRepository.js";
import { getRoomsWithExams, getRoomCapacitiesByRoom } from "../repository/examInvigilatorAssignmentRepository.js";
import { getAcademicYearId } from "../utility/requestContext.js";
import { getRoomCentricMetrics } from "../utility/roomCentricHelper.js";
import { Op } from "sequelize";

export async function addExamAttendance(data, createdBy, updatedBy) {
  const {
    examScheduleId,
    examScheduleRoomCapacityId,
    studentId,
    studentExamSeatId,
    attendanceStatus,
    markedBy,
    markedAt,
    remarks,
    universityId,
    instituteId,
    academicYearId,
  } = data;
  try {
    const newAttendance = {
      examScheduleId,
      examScheduleRoomCapacityId,
      studentId,
      studentExamSeatId,
      attendanceStatus,
      markedBy,
      markedAt,
      remarks,
      universityId,
      instituteId,
      academicYearId,
      createdBy,
      updatedBy,
    };
    return await examAttendanceRepository.createExamAttendance(newAttendance);
  } catch (error) {
    throw new Error(`Error creating exam attendance: ${error.message}`);
  }
}

export async function getAllExamAttendance(academicYearId) {
  try {
    const resolvedAcademicYearId =
      academicYearId != null ? Number(academicYearId) : getAcademicYearId();

    if (!resolvedAcademicYearId) {
      throw new Error("Active academic year not found");
    }

    return await examAttendanceRepository.getAllExamAttendance(
      resolvedAcademicYearId,
    );
  } catch (error) {
    throw new Error(`Error fetching exam attendance records: ${error.message}`);
  }
}

export async function getSingleExamAttendance(examAttendanceId) {
  try {
    return await examAttendanceRepository.getSingleExamAttendance(
      examAttendanceId,
    );
  } catch (error) {
    throw new Error(
      `Error fetching single exam attendance record: ${error.message}`,
    );
  }
}

export async function updateExamAttendances(attendances, updatedBy) {
  try {
    const updates = attendances.map((record) => ({
      ...record,
      updatedBy,
    }));
    const updatedRecords =
      await examAttendanceRepository.updateExamAttendances(updates);

    return updatedRecords;
  } catch (error) {
    throw new Error(`Error updating exam attendances: ${error.message}`);
  }
}

export async function deleteExamAttendance(examAttendanceId) {
  try {
    return await examAttendanceRepository.deleteExamAttendance(
      examAttendanceId,
    );
  } catch (error) {
    throw new Error(`Error deleting exam attendance record: ${error.message}`);
  }
}

export async function getExamOperationsAttendance(filters, pagination) {
  const { page = 1, limit = 10 } = pagination;

  // Reuse the same room-with-exams query from the invigilator module
  const allRows = await getRoomsWithExams(filters);

  // Build a set of all unique examScheduleRoomCapacityIds to batch-fetch attendance counts
  const capacityIds = allRows.map((rc) => rc.examScheduleRoomCapacityId);

  // Batch fetch attendance counts grouped by examScheduleRoomCapacityId + attendanceStatus
  const attendanceCounts = capacityIds.length
    ? await examAttendanceRepository.getAttendanceCountsForRoomCapacities(capacityIds)
    : [];

  // Build a map: capacityId → { present, absent, pending }
  const attendanceMap = new Map();
  for (const row of attendanceCounts) {
    const id = row.examScheduleRoomCapacityId;
    if (!attendanceMap.has(id)) {
      attendanceMap.set(id, { present: 0, absent: 0, pending: 0 });
    }
    const entry = attendanceMap.get(id);
    const count = parseInt(row.count, 10) || 0;
    if (row.attendanceStatus === "PRESENT") entry.present += count;
    else if (row.attendanceStatus === "ABSENT") entry.absent += count;
    else if (row.attendanceStatus === "PENDING") entry.pending += count;
  }

  // Group by classRoomSectionId — same pattern as invigilator rooms
  const roomMap = new Map();

  for (const rc of allRows) {
    const roomId = rc.classRoomSectionId;
    const schedule = rc.examSchedule;
    const subject = schedule?.subjectSchedule;
    const slot = schedule?.examinationSessionSlot;
    const att = attendanceMap.get(rc.examScheduleRoomCapacityId) || { present: 0, absent: 0, pending: 0 };
    const totalAttendance = att.present + att.absent + att.pending;

    const examEntry = {
      examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
      examScheduleId: schedule?.examScheduleId,
      examDate: schedule?.examDate,
      term: schedule?.term,
      sessionId: schedule?.sessionId,
      examinationSessionSlotId: schedule?.examinationSessionSlotId,
      subjectId: subject?.subjectId,
      subjectName: subject?.subjectName,
      subjectCode: subject?.subjectCode,
      courseId: subject?.courseId,
      slot: slot
        ? {
            examinationSessionSlotId: slot.examinationSessionSlotId,
            slotNumber: slot.slotNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }
        : null,
      capacity: rc.capacity,
      attendance: {
        present: att.present,
        absent: att.absent,
        pending: att.pending,
        total: totalAttendance,
        isGenerated: totalAttendance > 0,
      },
    };

    if (!roomMap.has(roomId)) {
      roomMap.set(roomId, {
        classRoomSectionId: roomId,
        roomNumber: rc.classRoom?.roomNumber,
        roomCapacity: rc.classRoom?.capacity,
        examCapacity: rc.classRoom?.examCapacity,
        exams: [],
      });
    }

    roomMap.get(roomId).exams.push(examEntry);
  }

  const allUniqueRooms = Array.from(roomMap.values());
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

export async function getExamOperationsAttendanceRoom(
  classRoomSectionId,
  examDate,
  examinationSessionSlotId,
) {
  const capacities = await examAttendanceRepository.getRoomCapacitiesForRoomSlot(
    classRoomSectionId,
    examDate,
    examinationSessionSlotId,
  );

  if (!capacities || capacities.length === 0) {
    throw new Error("No exam schedules found for this room, date, and slot");
  }

  const capacityIds = [];
  const capacityExamMap = {};
  for (let i = 0; i < capacities.length; i++) {
    const c = capacities[i];
    capacityIds.push(c.examScheduleRoomCapacityId);
    capacityExamMap[c.examScheduleRoomCapacityId] = c.examScheduleId;
  }

  const seats = await examAttendanceRepository.getStudentSeatsByCapacityIds(capacityIds);
  if (!seats || seats.length === 0) {
    throw new Error("Seat allocation is not done for this exam");
  }

  const attendances = await examAttendanceRepository.getAttendancesByCapacityIds(capacityIds);
  const attendanceMap = new Map();
  for (let i = 0; i < attendances.length; i++) {
    const att = attendances[i];
    attendanceMap.set(`${att.studentId}_${att.examScheduleRoomCapacityId}`, att.attendanceStatus);
  }

  const students = [];
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    const student = seat.student || {};
    const rowVal = seat.row || 0;
    const colVal = seat.column || 0;
    const rowChar = rowVal ? String.fromCharCode(64 + rowVal) : "";
    const seatNumber = rowChar ? `${rowChar}${colVal}` : "";
    const status = attendanceMap.get(`${seat.studentId}_${seat.examScheduleRoomCapacityId}`) || "PENDING";
    students.push({
      studentId: seat.studentId,
      enrollmentNumber: student.enrollNumber || student.scholarNumber || "",
      studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      row: rowVal,
      column: colVal,
      seatNumber,
      attendanceStatus: status,
      examScheduleId: capacityExamMap[seat.examScheduleRoomCapacityId],
    });
  }

  const invigilators = await examAttendanceRepository.getInvigilators(
    examinationSessionSlotId,
    examDate,
    classRoomSectionId,
  );

  const invigilatorList = [];
  for (let i = 0; i < invigilators.length; i++) {
    const inv = invigilators[i];
    invigilatorList.push({
      userId: inv.user ? inv.user.userId : inv.userId,
      userName: inv.user ? inv.user.userName : "",
    });
  }

  const firstCap = capacities[0];
  const firstSchedule = firstCap.examSchedule || {};

  return {
    examScheduleId: firstCap.examScheduleId,
    examScheduleRoomCapacityId: firstCap.examScheduleRoomCapacityId,
    exam: {
      subjectId: firstSchedule.subjectSchedule ? firstSchedule.subjectSchedule.subjectId : null,
      subjectName: firstSchedule.subjectSchedule ? firstSchedule.subjectSchedule.subjectName : "",
      subjectCode: firstSchedule.subjectSchedule ? firstSchedule.subjectSchedule.subjectCode : "",
      examDate: firstSchedule.examDate,
      startTime: firstSchedule.examinationSessionSlot ? firstSchedule.examinationSessionSlot.startTime : "",
      endTime: firstSchedule.examinationSessionSlot ? firstSchedule.examinationSessionSlot.endTime : "",
    },
    room: {
      classRoomSectionId,
      roomNumber: firstCap.classRoom ? firstCap.classRoom.roomNumber : "",
    },
    invigilators: invigilatorList,
    students,
    totalStudents: students.length,
  };
}

export async function markExamAttendance(attendanceData, user) {
  const { examScheduleId, examScheduleRoomCapacityId, students } =
    attendanceData;
  const { userId, universityId, defaultInstituteId, defaultAcademicYearId } =
    user;

  const seats = await examAttendanceRepository.getStudentSeats(
    examScheduleRoomCapacityId,
  );

  const seatMap = new Map();
  seats.forEach((seat) => {
    seatMap.set(seat.studentId, seat.studentExamSeatId);
  });

  const transaction = await examAttendanceRepository.sequelize.transaction();
  try {
    const results = [];
    for (const stud of students) {
      const studentExamSeatId = seatMap.get(stud.studentId) || null;

      const existing = await examAttendanceRepository.findAttendance(
        examScheduleId,
        examScheduleRoomCapacityId,
        stud.studentId,
        transaction,
      );

      if (existing) {
        const updated = await examAttendanceRepository.updateAttendance(
          existing,
          {
            attendanceStatus: stud.attendanceStatus,
            updatedBy: userId,
            markedBy: userId,
            markedAt: new Date(),
          },
          transaction,
        );
        results.push(updated);
      } else {
        const created = await examAttendanceRepository.createAttendance(
          {
            examScheduleId,
            examScheduleRoomCapacityId,
            studentId: stud.studentId,
            studentExamSeatId,
            attendanceStatus: stud.attendanceStatus,
            markedBy: userId,
            markedAt: new Date(),
            universityId,
            instituteId: defaultInstituteId,
            academicYearId: defaultAcademicYearId,
            createdBy: userId,
            updatedBy: userId,
          },
          transaction,
        );
        results.push(created);
      }
    }

    await examAttendanceRepository.updateRoomCapacityStatus(
      examScheduleRoomCapacityId,
      "IN_PROGRESS",
      transaction,
    );

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function updateRoomAttendanceStatus(statusData) {
  const { examScheduleId, examScheduleRoomCapacityId, status } = statusData;

  const roomCapacity = await examAttendanceRepository.getRoomCapacityById(
    examScheduleRoomCapacityId,
  );
  if (!roomCapacity) {
    throw new Error("Room capacity not found");
  }

  const seats = await examAttendanceRepository.getStudentSeats(
    examScheduleRoomCapacityId,
  );
  const attendances = await examAttendanceRepository.getAttendances(
    examScheduleId,
    examScheduleRoomCapacityId,
  );

  const presentCount = attendances.filter(
    (att) => att.attendanceStatus === "PRESENT",
  ).length;
  const absentCount = attendances.filter(
    (att) => att.attendanceStatus === "ABSENT",
  ).length;

  await examAttendanceRepository.updateRoomCapacityStatus(
    examScheduleRoomCapacityId,
    status,
  );

  return {
    status,
    totalStudents: seats.length,
    present: presentCount,
    absent: absentCount,
  };
}
export async function getExamAttendanceDetailsByRoom(classRoomSectionId, filters, options = {}) {
  const roomCapacities = await getRoomCapacitiesByRoom(
    classRoomSectionId,
    filters,
    options
  );

  const results = [];
  for (const rc of roomCapacities) {
    const metrics = await getRoomCentricMetrics(rc.examScheduleId, classRoomSectionId);
    
    // Fetch attendance sheet status
    const attendanceStatusRow = await examAttendanceRepository.getAttendanceStatusByExamSchedule(
      rc.examScheduleId,
      [rc.examScheduleRoomCapacityId]
    );
    const attendanceSheetStatus = (attendanceStatusRow && attendanceStatusRow.length > 0)
      ? attendanceStatusRow[0].status
      : "NOT_GENERATED";

    // Fetch attendance status counts
    const counts = await examAttendanceRepository.getAttendanceCountsForRoomCapacities([rc.examScheduleRoomCapacityId]);
    const countsObj = { present: 0, absent: 0, pending: 0 };
    counts.forEach(row => {
      if (row.attendanceStatus === "PRESENT") countsObj.present += parseInt(row.count, 10) || 0;
      else if (row.attendanceStatus === "ABSENT") countsObj.absent += parseInt(row.count, 10) || 0;
      else if (row.attendanceStatus === "PENDING") countsObj.pending += parseInt(row.count, 10) || 0;
    });

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
      slot: rc.examSchedule.examinationSessionSlot ? {
        examinationSessionSlotId: rc.examSchedule.examinationSessionSlot.examinationSessionSlotId,
        slotNumber: rc.examSchedule.examinationSessionSlot.slotNumber,
        startTime: rc.examSchedule.examinationSessionSlot.startTime,
        endTime: rc.examSchedule.examinationSessionSlot.endTime,
      } : null,
      roomNumber: rc.classRoom?.roomNumber,
      capacity: rc.capacity,
      attendanceSheetStatus,
      attendance: countsObj,
      roomDetails: metrics
    });
  }

  return results;
}

function buildExamAttendanceResponse({
  examSchedule,
  roomCapacities,
  studentCounts,
  attendanceStatuses,
  invigilators,
  attendanceCounts,
}) {
  const studentCountMap = new Map();
  studentCounts.forEach((item) => {
    studentCountMap.set(
      item.examScheduleRoomCapacityId,
      Number(item.studentCount),
    );
  });

  const statusMap = new Map();
  attendanceStatuses.forEach((item) => {
    statusMap.set(item.examScheduleRoomCapacityId, item.status);
  });

  const invigilatorMap = new Map();
  invigilators.forEach((inv) => {
    if (!invigilatorMap.has(inv.classRoomSectionId)) {
      invigilatorMap.set(inv.classRoomSectionId, []);
    }
    invigilatorMap.get(inv.classRoomSectionId).push({
      userId: inv.user ? inv.user.userId : inv.userId,
      userName: inv.user ? inv.user.userName : "",
    });
  });

  const attendanceCountsMap = new Map();
  (attendanceCounts || []).forEach((item) => {
    const capacityId = item.examScheduleRoomCapacityId;
    const status = item.attendanceStatus;
    const countVal = Number(item.count) || 0;

    if (!attendanceCountsMap.has(capacityId)) {
      attendanceCountsMap.set(capacityId, {
        present: 0,
        absent: 0,
        pending: 0,
      });
    }

    const countsObj = attendanceCountsMap.get(capacityId);
    if (status === "PRESENT") countsObj.present += countVal;
    else if (status === "ABSENT") countsObj.absent += countVal;
    else if (status === "PENDING") countsObj.pending += countVal;
  });

  let totalStudents = 0;
  let totalInvigilatorsSet = new Set();

  const rooms = roomCapacities.map((room) => {
    const capacityId = room.examScheduleRoomCapacityId;
    const studentCount = studentCountMap.get(capacityId) || 0;
    totalStudents += studentCount;

    const attendanceSheetStatus = statusMap.get(capacityId) || "NOT_GENERATED";

    const roomInvigilators = invigilatorMap.get(room.classRoomSectionId) || [];
    roomInvigilators.forEach((inv) => totalInvigilatorsSet.add(inv.userId));

    const countsObj = attendanceCountsMap.get(capacityId) || {
      present: 0,
      absent: 0,
      pending: 0,
    };
    const isGenerated = attendanceSheetStatus !== "NOT_GENERATED";

    const roomObj = {
      examScheduleRoomCapacityId: capacityId,
      classRoomSectionId: room.classRoomSectionId,
      roomNumber: room.classRoom ? room.classRoom.roomNumber : "",
      studentCount,
      attendanceSheetStatus,
      invigilators: roomInvigilators,
    };

    if (isGenerated) {
      roomObj.present = countsObj.present;
      roomObj.absent = countsObj.absent;
      roomObj.pending = countsObj.pending;
    }

    return roomObj;
  });

  const totalRooms = roomCapacities.length;
  const submittedOrVerifiedCount = roomCapacities.filter((room) => {
    const status = statusMap.get(room.examScheduleRoomCapacityId);
    return status === "SUBMITTED" || status === "VERIFIED";
  }).length;

  return {
    examScheduleId: examSchedule.examScheduleId,
    subjectId: examSchedule.subjectSchedule
      ? examSchedule.subjectSchedule.subjectId
      : null,
    subjectName: examSchedule.subjectSchedule
      ? examSchedule.subjectSchedule.subjectName
      : "",
    subjectCode: examSchedule.subjectSchedule
      ? examSchedule.subjectSchedule.subjectCode
      : "",
    examDate: examSchedule.examDate,
    startTime: examSchedule.examinationSessionSlot
      ? examSchedule.examinationSessionSlot.startTime
      : "",
    endTime: examSchedule.examinationSessionSlot
      ? examSchedule.examinationSessionSlot.endTime
      : "",
    totalStudents,
    totalRooms,
    totalInvigilators: totalInvigilatorsSet.size,
    attendanceSheets: {
      ready: submittedOrVerifiedCount,
      total: totalRooms,
    },
    rooms,
  };
}

export async function getExamOperationsSummary(examinationSessionId, filters) {
  const schedules = await examAttendanceRepository.getSchedulesForSummary(
    examinationSessionId,
    filters,
  );

  const todayStr = new Date().toISOString().split("T")[0];

  let upcomingExamCount = 0;
  let todayExamCount = 0;
  let assignedRoomCount = 0;
  let pendingAttendanceRoomCount = 0;
  let totalStudentCount = 0;
  let inProgressExamCount = 0;

  schedules.forEach((schedule) => {
    const isToday = schedule.examDate === todayStr;
    const isUpcoming = schedule.examDate > todayStr;

    if (isToday) {
      todayExamCount++;
    }
    if (isUpcoming) {
      upcomingExamCount++;
    }

    let scheduleHasInProgressRoom = false;

    (schedule.roomCapacities || []).forEach((room) => {
      const hasSeats = (room.seats || []).length > 0;
      if (hasSeats) {
        assignedRoomCount++;
        totalStudentCount += room.seats.length;
      }

      const status = room.status || "NOT_GENERATED";
      if (status !== "SUBMITTED" && status !== "VERIFIED") {
        pendingAttendanceRoomCount++;
      }

      if (status === "IN_PROGRESS") {
        scheduleHasInProgressRoom = true;
      }
    });

    if (isToday && scheduleHasInProgressRoom) {
      inProgressExamCount++;
    }
  });

  return {
    upcomingExamCount,
    todayExamCount,
    assignedRoomCount,
    pendingAttendanceRoomCount,
    totalStudentCount,
    inProgressExamCount,
  };
}




