import * as examScheduleRepository from "../repository/examScheduleRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import {
  buildStudentGroupFromSchedule,
  lookupStudentCount,
} from "../utility/studentCount.js";
import {
  getStudentCountMapByGroups,
  countStudentsForTermCohort,
  findStudentsForExamGroup,
  countStudentsForExamGroup,
} from "./studentCountServices.js";
import { decimalSubtract } from "../utility/decimalMoney.js";
import * as model from "../models/index.js";
import { resolveActiveAcademicYearContext } from "../utility/curriculumSubjectsByActiveYear.js";

function firstId(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value[0] != null ? Number(value[0]) : null;
  }
  return Number(value);
}

export async function getExamSchedules(filters) {
  const result = await examScheduleRepository.getExamSchedules(filters);
  if (!result.length) return result;

  const studentGroups = [];
  for (const schedule of result) {
    studentGroups.push(buildStudentGroupFromSchedule(schedule));
  }

  const countMap = await getStudentCountMapByGroups(studentGroups);

  for (let i = 0; i < result.length; i++) {
    result[i].setDataValue(
      "studentCount",
      lookupStudentCount(countMap, studentGroups[i]),
    );
  }

  return result;
}

export async function getExamScheduleExists(examScheduleId) {
  return await examScheduleRepository.getExamScheduleExists(examScheduleId);
}

export async function getExamScheduleById(examScheduleId) {
  const result =
    await examScheduleRepository.getExamScheduleById(examScheduleId);
  if (!result) return result;

  const group = buildStudentGroupFromSchedule(result);
  result.setDataValue("studentCount", await countStudentsForTermCohort(group));
  return result;
}

function getStudentDisplayName(student) {
  return `${student.firstName || ""} ${student.middleName || ""} ${student.lastName || ""}`
    .trim()
    .toLowerCase();
}

function orderStudentsByStrategy(students, strategy) {
  if (strategy === "ascending") {
    return [...students].sort((a, b) =>
      getStudentDisplayName(a).localeCompare(getStudentDisplayName(b)),
    );
  }
  if (strategy === "descending") {
    return [...students].sort((a, b) =>
      getStudentDisplayName(b).localeCompare(getStudentDisplayName(a)),
    );
  }
  return [...students].sort(() => Math.random() - 0.5);
}

function sortRoomCapacitiesByAllocationOrder(roomCapacities) {
  const normalizedOrderKeys = roomCapacities.map((room) =>
    Number(room.orderKey),
  );
  const hasInvalidOrderKey = normalizedOrderKeys.some(
    (orderKey) => !Number.isInteger(orderKey) || orderKey <= 0,
  );
  if (hasInvalidOrderKey) {
    throw new Error(
      "Invalid room allocation order. Please assign rooms with sequential order keys before allocating seats.",
    );
  }

  const uniqueOrderKeys = [...new Set(normalizedOrderKeys)].sort(
    (a, b) => a - b,
  );
  if (uniqueOrderKeys.length !== roomCapacities.length) {
    throw new Error(
      "Invalid room allocation order. Order keys must be unique for all assigned rooms.",
    );
  }

  const isSequential = uniqueOrderKeys.every(
    (orderKey, index) => orderKey === index + 1,
  );
  if (!isSequential) {
    throw new Error(
      `Invalid room allocation order. For ${roomCapacities.length} rooms, order keys must be 1 to ${roomCapacities.length} without gaps.`,
    );
  }

  return [...roomCapacities].sort((a, b) => a.orderKey - b.orderKey);
}

export async function allocateSeatsByStrategy(
  examScheduleId,
  userId,
  strategy = "random",
  options = {},
) {
  const transaction = options.transaction || (await sequelize.transaction());
  const isLocalTransaction = !options.transaction;
  try {
    const schedule = await examScheduleRepository.getExamScheduleById(
      examScheduleId,
      { transaction },
    );
    if (!schedule) {
      throw new Error("Exam schedule not found");
    }

    // 1. Get students — batch + term → classSectionTerm
    const batchId = schedule.batchId || schedule.batch?.batchId;
    const term = schedule.term || schedule.curriculumSubjectTermMapping?.term;

    let students = [];
    if (batchId && term) {
      students = await examScheduleRepository.findStudentsByBatchAndTerm(
        batchId,
        term,
        { transaction },
      );
    }
    if (!students.length) {
      const cohort = buildStudentGroupFromSchedule(schedule);
      students = await findStudentsForExamGroup(
        cohort.sessionId,
        cohort.courseId,
        cohort.term,
        cohort.academicYearId,
        {
          batchId: cohort.batchId,
          batchYear: cohort.batchYear,
          yearNumber: cohort.yearNumber,
          curriculumBatchTermMappingId: cohort.curriculumBatchTermMappingId,
          curriculumSubjectTermMappingId: cohort.curriculumSubjectTermMappingId,
          transaction,
        },
      );
    }
    if (students.length === 0) {
      throw new Error("No students found for this schedule");
    }

    // 2. Get room capacities directly using transaction so newly assigned rooms are visible
    const roomCapacities =
      await examScheduleRepository.getRoomsByExamScheduleId(examScheduleId, {
        transaction,
      });
    if (!roomCapacities.length) {
      throw new Error("No rooms assigned to this exam schedule");
    }

    // Room allocation must strictly follow orderKey: 1 first, 2 second, then onward.
    const orderedRoomCapacities =
      sortRoomCapacitiesByAllocationOrder(roomCapacities);

    const totalCapacity = orderedRoomCapacities.reduce(
      (sum, rc) => sum + rc.capacity,
      0,
    );
    if (totalCapacity < students.length) {
      throw new Error(
        `Insufficient capacity. Total capacity: ${totalCapacity}, Students: ${students.length}`,
      );
    }

    // 3. Prepare seat pool
    let seatPool = [];
    orderedRoomCapacities.forEach((rc) => {
      const cols = rc.columns;
      for (let i = 0; i < rc.capacity; i++) {
        seatPool.push({
          examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
          row: Math.floor(i / cols) + 1,
          column: (i % cols) + 1,
        });
      }
    });

    // 4. Order students by allocation strategy
    const orderedStudents = orderStudentsByStrategy(students, strategy);

    // 5. Clear existing allocations for these rooms
    const rcIds = orderedRoomCapacities.map(
      (rc) => rc.examScheduleRoomCapacityId,
    );
    await examScheduleRepository.clearExistingAllocations(rcIds, transaction);

    // 6. Allocate
    const allocations = orderedStudents.map((student, index) => ({
      examScheduleRoomCapacityId: seatPool[index].examScheduleRoomCapacityId,
      studentId: student.studentId,
      row: seatPool[index].row,
      column: seatPool[index].column,
      createdBy: userId,
      updatedBy: userId,
    }));

    const result = await examScheduleRepository.allocateSeats(
      allocations,
      transaction,
    );

    if (isLocalTransaction) {
      await transaction.commit();
    }
    return {
      allocatedCount: result.length,
      totalStudents: orderedStudents.length,
      totalCapacity,
    };
  } catch (error) {
    if (isLocalTransaction) {
      await transaction.rollback();
    }
    console.error(
      `Error in allocateSeatsByStrategy service (${strategy}):`,
      error,
    );
    throw error;
  }
}

export async function allocateSeatsRandomly(examScheduleId, userId) {
  return allocateSeatsByStrategy(examScheduleId, userId, "random");
}

export async function allocateSeatsAscending(examScheduleId, userId) {
  return allocateSeatsByStrategy(examScheduleId, userId, "ascending");
}

export async function allocateSeatsDescending(examScheduleId, userId) {
  return allocateSeatsByStrategy(examScheduleId, userId, "descending");
}

export async function getExamScheduleStudents(filters = {}, options = {}) {
  if (
    filters.isAllocated === true ||
    filters.isAllocated === "true" ||
    filters.allocated === true ||
    filters.allocated === "true"
  ) {
    return getAllocatedExamScheduleStudents(filters, options);
  }

  const {
    page = 1,
    limit = 10,
    search,
    courseId,
    batchId,
    curriculumSubjectTermMappingId,
    sessionId,
    term,
    subjectId,
    examScheduleId,
  } = filters;

  let resolvedExamScheduleId = firstId(examScheduleId);
  let resolvedCourseId = firstId(courseId);
  let resolvedSessionId = firstId(sessionId);
  let resolvedTerm = firstId(term);
  let resolvedBatchId = firstId(batchId);
  let resolvedAcademicYearId = null;
  let batchYear = null;
  let yearNumber = null;
  let curriculumBatchTermMappingIdResolved = firstId(
    curriculumSubjectTermMappingId,
  );

  if (!resolvedExamScheduleId && subjectId) {
    resolvedExamScheduleId =
      await examScheduleRepository.getExamScheduleIdBySubject(
        firstId(subjectId),
        resolvedSessionId,
        resolvedBatchId,
      );
  }

  if (resolvedExamScheduleId) {
    const schedule = await examScheduleRepository.getExamScheduleById(
      resolvedExamScheduleId,
    );
    if (schedule) {
      const cohort = buildStudentGroupFromSchedule(schedule);
      resolvedCourseId = resolvedCourseId || cohort.courseId;
      resolvedSessionId = resolvedSessionId || cohort.sessionId;
      resolvedTerm = resolvedTerm || cohort.term;
      resolvedAcademicYearId = cohort.academicYearId;
      batchYear = cohort.batchYear;
      yearNumber = cohort.yearNumber;
      curriculumBatchTermMappingIdResolved =
        cohort.curriculumBatchTermMappingId;
      resolvedBatchId = resolvedBatchId || cohort.batchId || schedule.batchId;
    }
  }

  if (resolvedBatchId) {
    const batchRecord = await model.batchModel.findByPk(resolvedBatchId);
    if (batchRecord) {
      resolvedSessionId = resolvedSessionId || batchRecord.sessionId;
      batchYear = batchYear || batchRecord.batch;
    }
  }

  if (resolvedSessionId && !resolvedCourseId) {
    const sessionRecord = await model.sessionModel.findByPk(resolvedSessionId);
    if (sessionRecord) {
      resolvedCourseId = sessionRecord.courseId;
      resolvedAcademicYearId =
        resolvedAcademicYearId || sessionRecord.academicYearId;
    }
  }

  if (!resolvedAcademicYearId) {
    const activeCtx = await resolveActiveAcademicYearContext();
    resolvedAcademicYearId = activeCtx?.academicYearId || null;
  }

  const hasCohortContext =
    (resolvedBatchId != null && resolvedTerm != null) ||
    (resolvedSessionId != null &&
      resolvedCourseId != null &&
      resolvedTerm != null);

  if (!hasCohortContext) {
    return {
      result: [],
      totalCount: 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: 0,
    };
  }

  let studentQueryResult = null;
  if (resolvedBatchId && resolvedTerm) {
    studentQueryResult =
      await examScheduleRepository.findStudentsByBatchAndTermPaginated(
        resolvedBatchId,
        resolvedTerm,
        { page, limit, search },
      );
  }

  if (!studentQueryResult || (!studentQueryResult.rows.length && !search)) {
    studentQueryResult = await findStudentsForExamGroup(
      resolvedSessionId,
      resolvedCourseId,
      resolvedTerm,
      resolvedAcademicYearId,
      {
        page,
        limit,
        search,
        batchId: resolvedBatchId,
        batchYear,
        yearNumber,
        curriculumBatchTermMappingId: curriculumBatchTermMappingIdResolved,
      },
    );
  }
  const { rows, totalCount } = studentQueryResult;
  const result = {
    result: rows,
    totalCount,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalCount / Number(limit)) || 0,
  };

  const seatMap = new Map();
  if (resolvedExamScheduleId) {
    const seats =
      await examScheduleRepository.getStudentSeatAllocationsBySchedule(
        resolvedExamScheduleId,
      );
    for (const seat of seats) {
      const rowVal = seat.row || 0;
      const colVal = seat.column || 0;
      const rowChar = rowVal ? String.fromCharCode(64 + rowVal) : "";
      const seatNumber = rowChar ? `${rowChar}${colVal}` : "";
      seatMap.set(seat.studentId, {
        roomAllocatedSeatNumber: seatNumber,
        roomName: seat.roomCapacity?.classRoom?.roomNumber || null,
      });
    }
  }

  const mapped = [];
  for (const student of result.result) {
    const plain = student.get ? student.get({ plain: true }) : student;
    const allocation = seatMap.get(plain.studentId);
    mapped.push({
      studentId: plain.studentId,
      scholarNumber: plain.scholarNumber,
      enrollNumber: plain.enrollNumber,
      firstName: plain.firstName,
      middleName: plain.middleName,
      lastName: plain.lastName,
      fatherName: plain.fatherName,
      course: plain.course || null,
      roomAllocatedSeatNumber: allocation
        ? allocation.roomAllocatedSeatNumber
        : null,
      roomName: allocation ? allocation.roomName : null,
    });
  }
  result.result = mapped;

  return result;
}

export async function getAllocatedExamScheduleStudents(
  filters = {},
  options = {},
) {
  const {
    page = 1,
    limit = 10,
    search,
    examScheduleId,
    examScheduleRoomCapacityId,
    classRoomSectionId,
    subjectId,
    sessionId,
    batchId,
  } = filters;

  let resolvedExamScheduleId = firstId(examScheduleId);
  const resolvedBatchId = firstId(batchId);
  const resolvedSessionId = firstId(sessionId);

  if (!resolvedExamScheduleId && subjectId) {
    resolvedExamScheduleId =
      await examScheduleRepository.getExamScheduleIdBySubject(
        firstId(subjectId),
        resolvedSessionId,
        resolvedBatchId,
      );
  }

  const {
    count,
    rows,
    page: pageNum,
    limit: limitNum,
  } = await examScheduleRepository.findAndCountAllocatedSeatsByFilters(
    {
      examScheduleId: resolvedExamScheduleId || undefined,
      examScheduleRoomCapacityId:
        firstId(examScheduleRoomCapacityId) || undefined,
      classRoomSectionId: firstId(classRoomSectionId) || undefined,
      search,
      page,
      limit,
    },
    options,
  );

  const mapped = rows.map((row) => {
    const plain = row.get ? row.get({ plain: true }) : row;
    const student = plain.student || {};
    const roomCapacity = plain.roomCapacity || {};
    const classRoom = roomCapacity.classRoom || {};

    const rowVal = plain.row || 0;
    const colVal = plain.column || 0;
    const rowChar = rowVal ? String.fromCharCode(64 + rowVal) : "";
    const seatNumber = rowChar ? `${rowChar}${colVal}` : "";

    return {
      studentExamSeatId: plain.studentExamSeatId,
      examScheduleId: roomCapacity.examScheduleId || resolvedExamScheduleId,
      examScheduleRoomCapacityId: plain.examScheduleRoomCapacityId,
      roomId: classRoom.classRoomSectionId || roomCapacity.classRoomSectionId,
      roomNumber: classRoom.roomNumber || null,
      row: rowVal,
      column: colVal,
      roomAllocatedSeatNumber: seatNumber,
      orderKey: roomCapacity.orderKey || null,
      studentId: student.studentId,
      scholarNumber: student.scholarNumber || null,
      enrollNumber: student.enrollNumber || null,
      firstName: student.firstName || null,
      middleName: student.middleName || null,
      lastName: student.lastName || null,
      studentName:
        `${student.firstName || ""} ${student.middleName || ""} ${student.lastName || ""}`.trim(),
      fatherName: student.fatherName || null,
      motherName: student.motherName || null,
      email: student.email || null,
      phone: student.mobileNumber || student.phoneNumber || null,
      gender: student.gender || null,
      courseId: student.courseId || null,
      courseName: student.course?.courseName || null,
      courseCode: student.course?.courseCode || null,
      batchId: student.batchId || null,
      batchYear: student.batch?.batch || null,
      classSectionsId: student.classSectionsId || null,
      classSectionTermId: student.classSectionTermId || null,
      createdAt: plain.createdAt,
    };
  });

  return {
    result: mapped,
    totalCount: count,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(count / limitNum) || 0,
  };
}

export async function addExamRoomCapacity(data, userId) {
  const { classRoomSectionIds = [], examScheduleId } = data || {};
  const resolvedExamScheduleId = Number(examScheduleId);

  // 1. Normalize room selections and detect payload duplicates
  const inputSelections = classRoomSectionIds.map((item, idx) => {
    const classRoomSectionId =
      typeof item === "number" ? item : item.classRoomSectionId;
    const orderKey =
      typeof item === "number" ||
      item.orderKey === undefined ||
      item.orderKey === null
        ? null
        : Number(item.orderKey);
    return { classRoomSectionId, orderKey, originalIndex: idx };
  });

  const inputRoomIds = inputSelections.map((s) => s.classRoomSectionId);
  if (new Set(inputRoomIds).size !== inputRoomIds.length) {
    throw new Error("Duplicate room IDs in assignment request");
  }

  const inputOrderKeys = inputSelections
    .map((s) => s.orderKey)
    .filter((k) => k !== null);
  if (new Set(inputOrderKeys).size !== inputOrderKeys.length) {
    throw new Error("Duplicate order keys in assignment request");
  }

  // 2. Fetch existing room capacities for the exam schedule
  const existingAssignments =
    await examScheduleRepository.getRoomsByExamScheduleId(
      resolvedExamScheduleId,
    );
  const existingMap = new Map(
    existingAssignments.map((a) => [a.classRoomSectionId, a]),
  );

  const newCandidates = [];
  const finalRoomsMap = new Map();

  for (const ext of existingAssignments) {
    finalRoomsMap.set(ext.classRoomSectionId, ext.orderKey);
  }

  for (const input of inputSelections) {
    if (existingMap.has(input.classRoomSectionId)) {
      continue;
    }
    newCandidates.push(input);
  }

  // 3. Assign sequential order keys to new room candidates
  let maxOrderKey =
    finalRoomsMap.size > 0 ? Math.max(...finalRoomsMap.values()) : 0;
  for (const candidate of newCandidates) {
    if (candidate.orderKey === null) {
      maxOrderKey++;
      candidate.orderKey = maxOrderKey;
    }
    finalRoomsMap.set(candidate.classRoomSectionId, candidate.orderKey);
  }

  // 4. Validate complete sequence of order keys (1 to N without gaps or duplicates)
  const allOrderKeys = Array.from(finalRoomsMap.values()).sort((a, b) => a - b);
  if (new Set(allOrderKeys).size !== allOrderKeys.length) {
    throw new Error(
      "Invalid room order. Duplicate order keys detected in final assignments.",
    );
  }
  const hasSequentialOrder = allOrderKeys.every(
    (orderKey, idx) => orderKey === idx + 1,
  );
  if (!hasSequentialOrder) {
    throw new Error(
      `Invalid room order. Order keys must be 1 to ${allOrderKeys.length} without gaps.`,
    );
  }

  if (newCandidates.length === 0) {
    return [];
  }

  const candidateRoomIds = newCandidates.map((c) => c.classRoomSectionId);

  // 5. Fetch room details for new candidates
  const roomLookup =
    await examScheduleRepository.getRoomsForAssignmentLookup(candidateRoomIds);
  if (roomLookup.size !== candidateRoomIds.length) {
    throw new Error("One or more class rooms not found");
  }

  const examSchedule =
    await examScheduleRepository.getExamScheduleForRoomAssignment(
      resolvedExamScheduleId,
    );
  if (!examSchedule) {
    throw new Error("Exam schedule not found");
  }
  if (examSchedule.published) {
    throw new Error(
      "Room assignment cannot be changed because the exam schedule is already published.",
    );
  }

  const examDate = examSchedule.examDate;

  // 6. Execute room capacity allocation & seat assignment within transaction
  const transaction = await sequelize.transaction();
  try {
    const batchId = examSchedule.batchId || examSchedule.batch?.batchId;
    const term =
      examSchedule.term || examSchedule.curriculumSubjectTermMapping?.term;

    let students = [];
    if (batchId && term) {
      students = await examScheduleRepository.findStudentsByBatchAndTerm(
        batchId,
        term,
        { transaction },
      );
    }
    if (!students.length) {
      const cohort = buildStudentGroupFromSchedule(examSchedule);
      students = await findStudentsForExamGroup(
        cohort.sessionId,
        cohort.courseId,
        cohort.term,
        cohort.academicYearId,
        {
          batchId: cohort.batchId,
          batchYear: cohort.batchYear,
          yearNumber: cohort.yearNumber,
          curriculumBatchTermMappingId: cohort.curriculumBatchTermMappingId,
          curriculumSubjectTermMappingId: cohort.curriculumSubjectTermMappingId,
          transaction,
        },
      );
    }
    const totalStudents = students.length;

    const alreadyAssignedCapacity =
      await examScheduleRepository.getAlreadyAssignedRoomCapacity(
        resolvedExamScheduleId,
        { transaction },
      );

    let remainingStudents = Math.max(
      0,
      decimalSubtract(totalStudents, alreadyAssignedCapacity),
    );

    const assignments = [];
    for (const candidate of newCandidates) {
      const roomId = candidate.classRoomSectionId;
      const room = roomLookup.get(roomId);

      const roomMaxCapacity = room.examCapacity ?? room.capacity;
      const resolvedExamColumns = room.examCapacityColumns ?? 1;

      if (!roomMaxCapacity || roomMaxCapacity <= 0) {
        throw new Error(`Room ${room.roomNumber} has invalid capacity`);
      }

      const usedCapacity =
        await examScheduleRepository.getOccupiedRoomSlotCapacity(
          roomId,
          examDate,
          examSchedule.examinationSessionSlotId,
          { transaction },
        );

      const remainingRoomCapacity = Math.max(
        0,
        decimalSubtract(roomMaxCapacity, usedCapacity),
      );
      const capacityToSave = Math.min(remainingStudents, remainingRoomCapacity);

      if (remainingRoomCapacity <= 0) {
        throw new Error(
          `Room ${room.roomNumber} is not available for the selected time slot. Booked capacity: ${usedCapacity}/${roomMaxCapacity}`,
        );
      }

      remainingStudents = Math.max(
        0,
        decimalSubtract(remainingStudents, capacityToSave),
      );

      assignments.push({
        universityId: examSchedule.universityId || room.universityId,
        instituteId: examSchedule.instituteId || room.instituteId,
        classRoomSectionId: room.classRoomSectionId,
        examScheduleId: resolvedExamScheduleId,
        capacity: capacityToSave,
        columns: resolvedExamColumns,
        orderKey: candidate.orderKey,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    const result = await examScheduleRepository.bulkCreateRoomAssignments(
      assignments,
      { transaction },
    );

    // Auto-allocate seats using "ascending" strategy
    try {
      await allocateSeatsByStrategy(
        resolvedExamScheduleId,
        userId,
        "ascending",
        { transaction },
      );
    } catch (seatErr) {
      console.error("Auto seat allocation skipped or failed:", seatErr.message);
    }

    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
