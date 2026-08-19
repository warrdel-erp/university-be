import * as examAttendanceRepository from "../repository/examAttendanceRepository.js";
import { getAcademicYearId } from "../utility/requestContext.js";
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

export async function getExamOperationsAttendance(filters) {
  const {
    examinationSessionId,
    examDate,
    examinationSessionSlotId,
    courseId,
    sessionId,
    term,
    search,
    page = 1,
    limit = 10,
  } = filters;

  const offset = (page - 1) * limit;

  const where = {};
  if (examinationSessionId) {
    where.examinationSessionId = Number(examinationSessionId);
  }
  if (examDate) {
    where.examDate = examDate;
  }
  if (examinationSessionSlotId) {
    where.examinationSessionSlotId = Number(examinationSessionSlotId);
  }
  if (sessionId) {
    where.sessionId = Number(sessionId);
  }
  if (term) {
    where.term = Number(term);
  }

  const subjectWhere = {};
  if (courseId) {
    subjectWhere.courseId = Number(courseId);
  }

  if (search) {
    where[Op.or] = [
      { "$subjectSchedule.subject_name$": { [Op.like]: `%${search}%` } },
      { "$subjectSchedule.subject_code$": { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await examAttendanceRepository.findAndCountSchedules(
    where,
    subjectWhere,
    Number(limit),
    Number(offset),
  );

  const roomCapacityIds = [];
  const examDates = [];
  const slotIds = [];
  const classRoomSectionIds = [];

  rows.forEach(schedule => {
      if (schedule.examDate && !examDates.includes(schedule.examDate)) {
          examDates.push(schedule.examDate);
      }
      if (schedule.examinationSessionSlotId && !slotIds.includes(schedule.examinationSessionSlotId)) {
          slotIds.push(schedule.examinationSessionSlotId);
      }
      (schedule.roomCapacities || []).forEach(room => {
          roomCapacityIds.push(room.examScheduleRoomCapacityId);
          if (room.classRoomSectionId && !classRoomSectionIds.includes(room.classRoomSectionId)) {
              classRoomSectionIds.push(room.classRoomSectionId);
          }
      });
  });

  const [attendanceCounts, invigilators] = await Promise.all([
      examAttendanceRepository.getAttendanceCountsForRoomCapacities(roomCapacityIds),
      examAttendanceRepository.getInvigilatorAssignmentsForSchedules({ examDates, slotIds, classRoomSectionIds })
  ]);

  const attendanceCountsMap = new Map();
  attendanceCounts.forEach(item => {
      const key = item.examScheduleRoomCapacityId;
      const status = item.attendanceStatus;
      const countVal = Number(item.count) || 0;
      if (!attendanceCountsMap.has(key)) {
          attendanceCountsMap.set(key, { present: 0, absent: 0, pending: 0 });
      }
      const countsObj = attendanceCountsMap.get(key);
      if (status === "PRESENT") countsObj.present += countVal;
      else if (status === "ABSENT") countsObj.absent += countVal;
      else if (status === "PENDING") countsObj.pending += countVal;
  });

  const invigilatorMap = new Set();
  invigilators.forEach(inv => {
      invigilatorMap.add(`${inv.examDate}_${inv.examinationSessionSlotId}_${inv.classRoomSectionId}`);
  });

  const data = rows.map((schedule) => {
    const scheduleData = schedule.get({ plain: true });

    let submittedCount = 0;

    scheduleData.roomCapacities = (scheduleData.roomCapacities || []).map(
      (room) => {
        const isRoomAllocationDone = (room.seats || []).length > 0;
        const countsObj = (attendanceCountsMap && room) ? (attendanceCountsMap.get(room.examScheduleRoomCapacityId) || { present: 0, absent: 0, pending: 0 }) : { present: 0, absent: 0, pending: 0 };
        
        const hasAttendanceGenerated = (countsObj.present + countsObj.absent + countsObj.pending) > 0;
        if (hasAttendanceGenerated) {
            submittedCount++;
        }

        const key = scheduleData ? `${scheduleData.examDate || ""}_${scheduleData.examinationSessionSlotId || ""}_${room.classRoomSectionId || ""}` : "";
        const isInvigilatorAssigned = invigilatorMap ? invigilatorMap.has(key) : false;

        return {
          examScheduleRoomCapacityId: room.examScheduleRoomCapacityId,
          classRoomSectionId: room.classRoomSectionId,
          capacity: room.capacity,
          classRoom: room.classRoom,
          status: room.status || "NOT_GENERATED",
          isRoomAllocationDone,
          isInvigilatorAssigned,
          present: countsObj.present,
          absent: countsObj.absent,
          pending: countsObj.pending,
          students: isRoomAllocationDone
            ? room.seats.map((seat) => ({
                studentExamSeatId: seat.studentExamSeatId,
                row: seat.row,
                column: seat.column,
                ...seat.student,
              }))
            : [],
        };
      },
    );

    scheduleData.submittedCount = submittedCount;
    scheduleData.totalSheets = (scheduleData.roomCapacities || []).length;

    return scheduleData;
  });

  return {
    paginationData: {
      total: count,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(count / limit),
    },
    data,
  };
}

export async function getExamOperationsAttendanceRoom(
  examScheduleId,
  examScheduleRoomCapacityId,
) {
  const schedule =
    await examAttendanceRepository.getScheduleDetails(examScheduleId);
  if (!schedule) {
    throw new Error("Exam schedule not found");
  }

  const roomCapacity = await examAttendanceRepository.getRoomCapacityDetails(
    examScheduleRoomCapacityId,
  );
  if (!roomCapacity) {
    throw new Error("Room capacity not found");
  }

  const classRoomSectionId = roomCapacity.classRoom
    ? roomCapacity.classRoom.classRoomSectionId
    : null;

  const invigilators = await examAttendanceRepository.getInvigilators(
    schedule.examinationSessionSlotId,
    schedule.examDate,
    classRoomSectionId,
  );

  const attendances = await examAttendanceRepository.getAttendancesWithStudent(
    examScheduleId,
    examScheduleRoomCapacityId,
  );

  const students = attendances.map((att) => {
    const student = att.student || {};
    const seat = att.studentExamSeat || {};
    const rowVal = seat.row || 0;
    const colVal = seat.column || 0;
    const rowChar = rowVal ? String.fromCharCode(64 + rowVal) : "";
    const seatNumber = rowChar ? `${rowChar}${colVal}` : "";
    return {
      studentId: att.studentId,
      enrollmentNumber: student.enrollNumber || student.scholarNumber || "",
      studentName:
        `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      row: rowVal,
      column: colVal,
      seatNumber,
      attendanceStatus: att.attendanceStatus,
    };
  });

  const invigilatorList = invigilators.map((inv) => ({
    userId: inv.user ? inv.user.userId : inv.userId,
    userName: inv.user ? inv.user.userName : "",
  }));

  return {
    examScheduleId,
    examScheduleRoomCapacityId,
    exam: {
      subjectName: schedule.subjectSchedule
        ? schedule.subjectSchedule.subjectName
        : "",
      subjectCode: schedule.subjectSchedule
        ? schedule.subjectSchedule.subjectCode
        : "",
      examDate: schedule.examDate,
      startTime: schedule.examinationSessionSlot
        ? schedule.examinationSessionSlot.startTime
        : "",
      endTime: schedule.examinationSessionSlot
        ? schedule.examinationSessionSlot.endTime
        : "",
    },
    room: {
      classRoomSectionId,
      roomNumber: roomCapacity.classRoom
        ? roomCapacity.classRoom.roomNumber
        : "",
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

export async function getExamAttendanceDetails(examScheduleId) {
  const examSchedule =
    await examAttendanceRepository.getExamScheduleById(examScheduleId);

  if (!examSchedule) {
    throw new Error("Exam schedule not found");
  }

  const roomCapacities =
    await examAttendanceRepository.getRoomCapacitiesByExamScheduleId(
      examScheduleId,
    );

  const roomCapacityIds = roomCapacities.map(
    (item) => item.examScheduleRoomCapacityId,
  );

  const [studentCounts, attendanceStatuses, invigilators, attendanceCounts] =
    await Promise.all([
      examAttendanceRepository.getStudentCountsByRoomCapacityIds(
        roomCapacityIds,
      ),

      examAttendanceRepository.getAttendanceStatusByExamSchedule(
        examScheduleId,
        roomCapacityIds,
      ),

      examAttendanceRepository.getInvigilatorsByRooms({
        examDate: examSchedule.examDate,
        examinationSessionSlotId: examSchedule.examinationSessionSlotId,
        classRoomSectionIds: roomCapacities.map(
          (item) => item.classRoomSectionId,
        ),
      }),

      examAttendanceRepository.getAttendanceCountsByRoom(examScheduleId),
    ]);

  return buildExamAttendanceResponse({
    examSchedule,
    roomCapacities,
    studentCounts,
    attendanceStatuses,
    invigilators,
    attendanceCounts,
  });
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

export async function generateRoomAttendance(generateData, user) {
  const { examScheduleId, examScheduleRoomCapacityId } = generateData;
  const { userId, universityId, defaultInstituteId, defaultAcademicYearId } =
    user;

  const roomCapacity = await examAttendanceRepository.getRoomCapacityById(
    examScheduleRoomCapacityId,
  );
  if (!roomCapacity) {
    throw new Error("Room capacity not found");
  }

  const seats = await examAttendanceRepository.getStudentSeats(
    examScheduleRoomCapacityId,
  );
  if (!seats || seats.length === 0) {
    throw new Error("No student seats allocated in this room");
  }

  const existingAttendances = await examAttendanceRepository.getAttendances(
    examScheduleId,
    examScheduleRoomCapacityId,
  );
  const existingStudentIds = new Set(
    existingAttendances.map((att) => att.studentId),
  );

  const transaction = await examAttendanceRepository.sequelize.transaction();
  try {
    const results = [];
    for (const seat of seats) {
      if (!existingStudentIds.has(seat.studentId)) {
        const created = await examAttendanceRepository.createAttendance(
          {
            examScheduleId,
            examScheduleRoomCapacityId,
            studentId: seat.studentId,
            studentExamSeatId: seat.studentExamSeatId || null,
            attendanceStatus: "PENDING",
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
      "GENERATED",
      transaction,
    );

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
