import * as examAttendanceRepository from "../repository/examAttendanceRepository.js";
import {
  getRoomsWithExams,
  getRoomCapacitiesByRoom,
  getAssignmentsForRooms,
} from "../repository/examInvigilatorAssignmentRepository.js";
import { getAcademicYearId } from "../utility/requestContext.js";
import { getRoomCentricMetrics } from "../utility/roomCentricHelper.js";
import { Op } from "sequelize";
import { formatDateKey } from "../utility/dateFormat.js";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";

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

  const allRows = await getRoomsWithExams(filters);

  const roomMap = new Map();

  for (const rc of allRows) {
    const roomId = rc.classRoomSectionId;
    const schedule = rc.examSchedule;
    const subject = schedule?.subjectSchedule;
    const slot = schedule?.examinationSessionSlot;

    const examEntry = {
      examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
      examScheduleId: schedule?.examScheduleId,
      term: schedule?.term,
      sessionId: schedule?.sessionId,
      subjectId: subject?.subjectId,
      subjectName: subject?.subjectName,
      subjectCode: subject?.subjectCode,
      courseId: subject?.courseId,
      capacity: rc.capacity,
      studentCount: 0,
    };

    const examDateStr = formatDateKey(schedule?.examDate);
    const slotId = schedule?.examinationSessionSlotId;
    const key = `${roomId}_${examDateStr}_${slotId}`;

    if (!roomMap.has(key)) {
      roomMap.set(key, {
        classRoomSectionId: roomId,
        roomNumber: rc.classRoom?.roomNumber,
        roomCapacity: rc.classRoom?.capacity,
        examCapacity: rc.classRoom?.examCapacity,
        examDate: schedule?.examDate,
        slot: slot
          ? {
              examinationSessionSlotId: slot.examinationSessionSlotId,
              slotNumber: slot.slotNumber,
              startTime: slot.startTime,
              endTime: slot.endTime,
            }
          : null,
        exams: [],
      });
    }

    roomMap.get(key).exams.push(examEntry);
  }

  const allUniqueRooms = Array.from(roomMap.values());
  const total = allUniqueRooms.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const paginatedRooms = allUniqueRooms.slice(offset, offset + limitNum);

  const capacityIds = [];
  for (const room of paginatedRooms) {
    for (const exam of room.exams) {
      capacityIds.push(exam.examScheduleRoomCapacityId);
    }
  }

  const seatCounts = capacityIds.length
    ? await model.studentExamSeatModel.findAll({
        where: { examScheduleRoomCapacityId: { [Op.in]: capacityIds } },
        attributes: [
          "examScheduleRoomCapacityId",
          [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"],
        ],
        group: ["examScheduleRoomCapacityId"],
        raw: true,
      })
    : [];

  const seatCountMap = new Map();
  for (const row of seatCounts) {
    seatCountMap.set(
      Number(row.examScheduleRoomCapacityId),
      parseInt(row.studentCount, 10) || 0,
    );
  }

  for (const room of paginatedRooms) {
    for (const exam of room.exams) {
      exam.studentCount =
        seatCountMap.get(exam.examScheduleRoomCapacityId) || 0;
    }
  }

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
  const capacities =
    await examAttendanceRepository.getRoomCapacitiesForRoomSlot(
      classRoomSectionId,
      examDate,
      examinationSessionSlotId,
    );

  if (!capacities || capacities.length === 0) {
    throw new Error("No exam schedules found for this room, date, and slot");
  }

  const capacityIds = capacities.map((c) => c.examScheduleRoomCapacityId);

  const seats =
    await examAttendanceRepository.getStudentSeatsByCapacityIds(capacityIds);
  if (!seats || seats.length === 0) {
    throw new Error("Seat allocation is not done for this exam");
  }

  const attendances =
    await examAttendanceRepository.getAttendancesByCapacityIds(capacityIds);
  const attendanceMap = new Map();
  for (let i = 0; i < attendances.length; i++) {
    const att = attendances[i];
    attendanceMap.set(
      `${att.studentId}_${att.examScheduleRoomCapacityId}`,
      att.attendanceStatus,
    );
  }

  const students = [];
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    const student = seat.student || {};
    const rowVal = seat.row || 0;
    const colVal = seat.column || 0;
    const rowChar = rowVal ? String.fromCharCode(64 + rowVal) : "";
    const seatNumber = rowChar ? `${rowChar}${colVal}` : "";
    const status =
      attendanceMap.get(
        `${seat.studentId}_${seat.examScheduleRoomCapacityId}`,
      ) || "PENDING";

    const rc = capacities.find(
      (c) =>
        Number(c.examScheduleRoomCapacityId) ===
        Number(seat.examScheduleRoomCapacityId),
    );
    const schedule = rc ? rc.examSchedule : null;
    const subject = schedule ? schedule.subjectSchedule : null;
    const courseName =
      subject && subject.courseInfo ? subject.courseInfo.courseName : "";
    const term = schedule ? schedule.term : null;

    students.push({
      studentId: seat.studentId,
      enrollmentNumber: student.enrollNumber || student.scholarNumber || "",
      enrollment: student.enrollNumber || student.scholarNumber || "",
      studentName:
        `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      row: rowVal,
      column: colVal,
      seatNumber,
      attendanceStatus: status,
      examScheduleId: rc ? rc.examScheduleId : null,
      courseName,
      term,
      subjectId: subject ? subject.subjectId : null,
      subjectName: subject ? subject.subjectName : "",
      subjectCode: subject ? subject.subjectCode : "",
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

  const exams = capacities.map((rc) => {
    const schedule = rc.examSchedule || {};
    const subject = schedule.subjectSchedule || {};
    return {
      examScheduleId: rc.examScheduleId,
      examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
      subjectId: subject.subjectId || null,
      subjectName: subject.subjectName || "",
      subjectCode: subject.subjectCode || "",
      examDate: schedule.examDate,
      startTime: schedule.examinationSessionSlot ? schedule.examinationSessionSlot.startTime : "",
      endTime: schedule.examinationSessionSlot ? schedule.examinationSessionSlot.endTime : "",
    };
  });

  return {
    examScheduleId: firstCap.examScheduleId,
    examScheduleRoomCapacityId: firstCap.examScheduleRoomCapacityId,
    exams,
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
export async function getExamAttendanceDetailsByRoom(
  classRoomSectionId,
  filters,
  options = {},
) {
  const roomCapacities = await getRoomCapacitiesByRoom(
    classRoomSectionId,
    filters,
    options,
  );

  if (!roomCapacities.length) {
    return null;
  }

  const firstRc = roomCapacities[0];
  const examDate = firstRc.examSchedule.examDate;
  const slotId = firstRc.examSchedule.examinationSessionSlotId;

  // 1. Fetch invigilators assigned to this room at this slot/date
  const invigilatorsRaw = await getAssignmentsForRooms(
    [Number(classRoomSectionId)],
    [examDate],
    [slotId],
    options,
  );

  const invigilators = invigilatorsRaw.map((inv) => ({
    examInvigilatorAssignmentId: inv.examInvigilatorAssignmentId,
    userId: inv.user ? inv.user.userId : inv.userId,
    userName: inv.user ? inv.user.userName : "",
    role: inv.role,
  }));

  // 2. Fetch seat counts for sibling capacities in the room to get numberOfStudentInRoom
  const siblingCapacityIds = roomCapacities.map(
    (rc) => rc.examScheduleRoomCapacityId,
  );

  const seatCounts = siblingCapacityIds.length
    ? await model.studentExamSeatModel.findAll({
        where: {
          examScheduleRoomCapacityId: { [Op.in]: siblingCapacityIds },
        },
        attributes: [
          "examScheduleRoomCapacityId",
          [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"],
        ],
        group: ["examScheduleRoomCapacityId"],
        raw: true,
        transaction: options.transaction,
      })
    : [];

  const seatCountMap = new Map(
    seatCounts.map((r) => [
      Number(r.examScheduleRoomCapacityId),
      parseInt(r.studentCount, 10) || 0,
    ]),
  );

  // 3. Process exams and compute student count in this room and total count in subject across all rooms
  const exams = [];
  let totalStudentsAll = 0;

  for (const rc of roomCapacities) {
    const numberOfStudentInRoom =
      seatCountMap.get(Number(rc.examScheduleRoomCapacityId)) || 0;
    totalStudentsAll += numberOfStudentInRoom;

    // Fetch total student count for this exam schedule across all rooms
    const examScheduleCapacities =
      await model.examScheduleRoomCapacityModel.findAll({
        where: { examScheduleId: Number(rc.examScheduleId) },
        transaction: options.transaction,
      });
    const capacityIds = examScheduleCapacities.map(
      (c) => c.examScheduleRoomCapacityId,
    );
    const totalStudentsInSubject = capacityIds.length
      ? await model.studentExamSeatModel.count({
          where: { examScheduleRoomCapacityId: { [Op.in]: capacityIds } },
          transaction: options.transaction,
        })
      : 0;

    exams.push({
      examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
      examScheduleId: rc.examScheduleId,
      term: rc.examSchedule?.term,
      sessionId: rc.examSchedule?.sessionId,
      subjectId: rc.examSchedule?.subjectSchedule?.subjectId,
      subjectName: rc.examSchedule?.subjectSchedule?.subjectName,
      subjectCode: rc.examSchedule?.subjectSchedule?.subjectCode,
      courseId: rc.examSchedule?.subjectSchedule?.courseId,
      classRoomSectionId: Number(classRoomSectionId),
      capacity: rc.capacity,
      numberOfStudentInRoom,
      totalStudentsInSubject,
      isSeatAllocationDone: numberOfStudentInRoom > 0,
    });
  }

  const isRoomSeatAllocationDone = roomCapacities.every(
    (rc) => (seatCountMap.get(Number(rc.examScheduleRoomCapacityId)) || 0) > 0,
  );

  // 4. Build room details
  const roomDetails = {
    classRoomSectionId: Number(classRoomSectionId),
    roomNumber: firstRc.classRoom?.roomNumber,
    numberOfExamsInRoom: roomCapacities.length,
    numberOfInvigilatorsInRoom: invigilators.length,
    totalStudentsAll,
    isSeatAllocationDone: isRoomSeatAllocationDone,
  };

  return {
    examDate,
    slot: firstRc.examSchedule?.examinationSessionSlot
      ? {
          examinationSessionSlotId:
            firstRc.examSchedule.examinationSessionSlot
              .examinationSessionSlotId,
          slotNumber: firstRc.examSchedule.examinationSessionSlot.slotNumber,
          startTime: firstRc.examSchedule.examinationSessionSlot.startTime,
          endTime: firstRc.examSchedule.examinationSessionSlot.endTime,
        }
      : null,
    roomDetails,
    invigilators,
    exams,
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
