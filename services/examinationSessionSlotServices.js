import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionSlotRepository from "../repository/examinationSessionSlotRepository.js";
import * as examScheduleRepository from "../repository/examScheduleRepository.js";
import * as examinationSessionServices from "./examinationSessionServices.js";

function addMinutesToTime(timeStr, minutes) {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  let hours = parts[0] || 0;
  let mins = parts[1] || 0;
  let secs = parts[2] || 0;

  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor((totalMinutes / 60) % 24);
  const newMins = Math.floor(totalMinutes % 60);

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(newHours)}:${pad(newMins)}:${pad(secs)}`;
}

function toPlain(record) {
  return record?.get ? record.get({ plain: true }) : record;
}

function buildStudentCountGroupKey(sessionId, courseId, term, academicYearId) {
  return `${Number(sessionId)}_${Number(courseId)}_${Number(term)}_${Number(academicYearId)}`;
}

function buildStudentCountMap(counts) {
  const studentCountByGroup = new Map();
  for (const row of counts) {
    studentCountByGroup.set(
      buildStudentCountGroupKey(
        row.sessionId,
        row.courseId,
        row.term,
        row.academicYearId,
      ),
      parseInt(row.studentCount, 10) || 0,
    );
  }
  return studentCountByGroup;
}

function indexRoomsByExamSchedule(roomRows) {
  const roomNumbersMap = new Map();
  const roomCapacityMap = new Map();

  for (const room of roomRows) {
    if (!roomNumbersMap.has(room.examScheduleId)) {
      roomNumbersMap.set(room.examScheduleId, []);
      roomCapacityMap.set(room.examScheduleId, 0);
    }

    roomNumbersMap.get(room.examScheduleId).push(room.classRoom?.roomNumber);
    roomCapacityMap.set(
      room.examScheduleId,
      roomCapacityMap.get(room.examScheduleId) + Number(room.capacity || 0),
    );
  }

  return { roomNumbersMap, roomCapacityMap };
}

function resolveScheduleGroupIds(schedules) {
  const sessionsForCounts = new Set();
  const coursesForCounts = new Set();
  const termsForCounts = new Set();
  const acedmicYearsForCounts = new Set();
  const examScheduleIds = [];

  for (const schedule of schedules) {
    const item = toPlain(schedule);
    examScheduleIds.push(item.examScheduleId);

    const courseId = item.subjectSchedule?.courseId;
    const term = item.term ?? item.subjectSchedule?.term;
    const academicYearId =
      item.academicYearId ?? item.subjectSchedule?.academicYearId;

    if (item.sessionId) sessionsForCounts.add(item.sessionId);
    if (courseId) coursesForCounts.add(courseId);
    if (term) termsForCounts.add(term);
    if (academicYearId) acedmicYearsForCounts.add(academicYearId);
  }

  return {
    examScheduleIds,
    sessionsForCounts,
    coursesForCounts,
    termsForCounts,
    acedmicYearsForCounts,
  };
}

async function loadStudentCountMap(groupIds, options = {}) {
  if (
    groupIds.sessionsForCounts.size === 0 ||
    groupIds.coursesForCounts.size === 0 ||
    groupIds.termsForCounts.size === 0
  ) {
    return new Map();
  }

  const counts = await examScheduleRepository.getStudentCountsByGroups(
    Array.from(groupIds.sessionsForCounts),
    Array.from(groupIds.coursesForCounts),
    Array.from(groupIds.termsForCounts),
    Array.from(groupIds.acedmicYearsForCounts),
    options,
  );
  return buildStudentCountMap(counts);
}

function applyScheduleStatusFlags(item, studentCount, roomCapacity, roomNumbers) {
  const hasAssignedRoom = roomCapacity > 0;
  const published = item.published || false;

  item.studentCount = studentCount;
  item.courseName = item.subjectSchedule?.courseInfo?.courseName || null;
  item.termType = item.subjectSchedule?.courseInfo?.termType || null;
  item.roomNumbers = roomNumbers;
  item.roomCapacity = roomCapacity;
  item.needsScheduling = false;
  item.published = published;
  item.roomPending = !hasAssignedRoom || roomCapacity < studentCount;
  item.needsRoom = false;
  item.ready = !published && roomCapacity >= studentCount;

  return item;
}

function enrichScheduleItems(schedules, roomNumbersMap, roomCapacityMap, studentCountByGroup) {
  const scheduleMap = new Map();

  for (const schedule of schedules) {
    const item = toPlain(schedule);
    const courseId = item.subjectSchedule?.courseId;
    const term = item.term ?? item.subjectSchedule?.term;
    const academicYearId =
      item.academicYearId ?? item.subjectSchedule?.academicYearId;

    const studentCount =
      studentCountByGroup.get(
        buildStudentCountGroupKey(
          item.sessionId,
          courseId,
          term,
          academicYearId,
        ),
      ) || 0;

    applyScheduleStatusFlags(
      item,
      studentCount,
      roomCapacityMap.get(item.examScheduleId) || 0,
      roomNumbersMap.get(item.examScheduleId) || [],
    );

    if (!scheduleMap.has(item.examinationSessionSlotId)) {
      scheduleMap.set(item.examinationSessionSlotId, []);
    }
    scheduleMap.get(item.examinationSessionSlotId).push(item);
  }

  return scheduleMap;
}

function mapUnscheduledSubjects(subjectsList) {
  const unscheduledSubjectsMapped = [];
  for (const sub of subjectsList) {
    unscheduledSubjectsMapped.push({
      examScheduleId: null,
      subjectId: sub.subjectId,
      term: sub.term,
      academicYearId: sub.academicYearId || null,
      sessionId: sub.sessionId,
      examDate: null,
      examTime: null,
      type: null,
      duration: null,
      examinationSessionSlotId: null,
      studentCount: sub.studentCount || 0,
      courseName: sub.courseName || null,
      termType: sub.termType || null,
      roomNumbers: [],
      roomCapacity: 0,
      needsScheduling: true,
      roomPending: false,
      needsRoom: false,
      ready: false,
      published: false,
    });
  }
  return unscheduledSubjectsMapped;
}

function buildSlotsWithSchedules(slots, scheduleMap, filterStatus, unscheduledSubjectsMapped) {
  const result = [];

  for (const slot of slots) {
    let list = scheduleMap.get(slot.examinationSessionSlotId) || [];

    if (
      filterStatus &&
      filterStatus !== "all" &&
      filterStatus !== "needsScheduling"
    ) {
      const filtered = [];
      for (const sched of list) {
        if (sched[filterStatus] === true) {
          filtered.push(sched);
        }
      }
      list = filtered;
    }

    if (filterStatus === "needsScheduling") {
      list = [];
    }

    result.push({
      ...slot,
      schedules: [...list, ...unscheduledSubjectsMapped],
    });
  }

  return result;
}

async function loadSlotSchedulesContext(
  { examinationSessionId, date, selections },
  options = {},
) {
  const { filterCombinations } =
    await examinationSessionServices.resolveSelectionFilters(
      selections,
      options,
    );

  const slots =
    await examinationSessionSlotRepository.findSlotsByExaminationSessionId(
      examinationSessionId,
      options,
    );

  if (!slots.length) {
    return {
      slots: [],
      schedules: [],
      filterCombinations,
      roomNumbersMap: new Map(),
      roomCapacityMap: new Map(),
      studentCountByGroup: new Map(),
    };
  }

  const slotIds = [];
  for (const slot of slots) {
    slotIds.push(slot.examinationSessionSlotId);
  }

  const schedules =
    await examinationSessionSlotRepository.findExamSchedulesForSlots(
      { slotIds, date, filterCombinations },
      options,
    );

  if (!schedules.length) {
    return {
      slots,
      schedules: [],
      filterCombinations,
      roomNumbersMap: new Map(),
      roomCapacityMap: new Map(),
      studentCountByGroup: new Map(),
    };
  }

  const groupIds = resolveScheduleGroupIds(schedules);
  const [roomRows, studentCountByGroup] = await Promise.all([
    examinationSessionSlotRepository.findRoomsForExamSchedules(
      groupIds.examScheduleIds,
      options,
    ),
    loadStudentCountMap(groupIds, options),
  ]);

  const { roomNumbersMap, roomCapacityMap } = indexRoomsByExamSchedule(roomRows);

  return {
    slots,
    schedules,
    filterCombinations,
    roomNumbersMap,
    roomCapacityMap,
    studentCountByGroup,
  };
}

export async function createExaminationSessionSlot(
  { payload, user },
  options = {},
) {
  return await sequelize.transaction(async (t) => {
    const examinationSessionId = Number(payload.examinationSessionId);
    const numberOfSlots = payload.numberOfSlots
      ? Number(payload.numberOfSlots)
      : 1;
    const durationMinutes =
      payload.durationMinutes !== undefined && payload.durationMinutes !== null
        ? Number(payload.durationMinutes)
        : null;
    const initialStartTime = payload.startTime || null;

    const maxSlotNumber =
      await examinationSessionSlotRepository.getMaxSlotNumber(
        examinationSessionId,
        { ...options, transaction: t },
      );
    const baseSlotNumber =
      payload.slotNumber !== undefined && payload.slotNumber !== null
        ? Number(payload.slotNumber)
        : maxSlotNumber + 1;

    const createdSlots = [];
    let currentStartTime = initialStartTime;

    for (let i = 0; i < numberOfSlots; i++) {
      let currentEndTime = payload.endTime || null;

      if (currentStartTime && durationMinutes) {
        currentEndTime = addMinutesToTime(currentStartTime, durationMinutes);
      }

      const slotData = {
        examinationSessionId,
        slotNumber: baseSlotNumber + i,
        startTime: currentStartTime,
        endTime: currentEndTime,
        durationMinutes: durationMinutes,
        createdBy: user?.userId || null,
        updatedBy: user?.userId || null,
      };

      const newSlot =
        await examinationSessionSlotRepository.createExaminationSessionSlot(
          slotData,
          { ...options, transaction: t },
        );
      createdSlots.push(newSlot);

      if (currentEndTime && durationMinutes) {
        currentStartTime = currentEndTime;
      }
    }

    return numberOfSlots === 1 ? createdSlots[0] : createdSlots;
  });
}

export async function getExaminationSessionSlots(
  { examinationSessionId, date, selections, filterStatus },
  options = {},
) {
  const context = await loadSlotSchedulesContext(
    { examinationSessionId, date, selections },
    options,
  );

  if (!context.slots.length) {
    return [];
  }

  if (!context.schedules.length) {
    const empty = [];
    for (const slot of context.slots) {
      empty.push({
        ...slot,
        schedules: [],
      });
    }
    return empty;
  }

  const scheduleMap = enrichScheduleItems(
    context.schedules,
    context.roomNumbersMap,
    context.roomCapacityMap,
    context.studentCountByGroup,
  );

  let unscheduledSubjectsMapped = [];
  if (
    filterStatus === "needsScheduling" &&
    context.filterCombinations.length > 0
  ) {
    const subjectsList =
      await examinationSessionServices.getMappedSubjectsBySessionAndTerm(
        {
          examinationSessionId,
          selections,
          filterStatus: "needsScheduling",
        },
        options,
      );
    unscheduledSubjectsMapped = mapUnscheduledSubjects(subjectsList);
  }

  return buildSlotsWithSchedules(
    context.slots,
    scheduleMap,
    filterStatus,
    unscheduledSubjectsMapped,
  );
}

export async function getExaminationSessionSlotsCount(
  { examinationSessionId, date, selections },
  options = {},
) {
  const { filterCombinations } =
    await examinationSessionServices.resolveSelectionFilters(
      selections,
      options,
    );

  const slots =
    await examinationSessionSlotRepository.findSlotsByExaminationSessionId(
      examinationSessionId,
      options,
    );

  let allCount = 0;
  let roomPendingCount = 0;
  let readyCount = 0;
  let publishedCount = 0;
  let needsSchedulingCount = 0;

  if (slots.length > 0) {
    const slotIds = [];
    for (const slot of slots) {
      slotIds.push(slot.examinationSessionSlotId);
    }

    const schedules =
      await examinationSessionSlotRepository.findExamSchedulesForSlotsCount(
        { slotIds, date, filterCombinations },
        options,
      );

    if (schedules.length > 0) {
      allCount = schedules.length;

      const groupIds = resolveScheduleGroupIds(schedules);
      const [roomRows, studentCountByGroup] = await Promise.all([
        examinationSessionSlotRepository.findRoomsForExamSchedules(
          groupIds.examScheduleIds,
          options,
        ),
        loadStudentCountMap(groupIds, options),
      ]);

      const { roomCapacityMap } = indexRoomsByExamSchedule(roomRows);

      for (const schedule of schedules) {
        const item = toPlain(schedule);
        const courseId = item.subjectSchedule?.courseId;
        const term = item.term ?? item.subjectSchedule?.term;
        const academicYearId =
          item.academicYearId ?? item.subjectSchedule?.academicYearId;
        const studentCount =
          studentCountByGroup.get(
            buildStudentCountGroupKey(
              item.sessionId,
              courseId,
              term,
              academicYearId,
            ),
          ) || 0;
        const roomCapacity = roomCapacityMap.get(item.examScheduleId) || 0;
        const hasAssignedRoom = roomCapacity > 0;
        const isPublished = item.published || false;

        if (isPublished) {
          publishedCount++;
        } else {
          const roomPending =
            !hasAssignedRoom || roomCapacity < studentCount;
          const ready = roomCapacity >= studentCount;
          if (roomPending) {
            roomPendingCount++;
          }
          if (ready) {
            readyCount++;
          }
        }
      }
    }

    if (filterCombinations.length > 0) {
      const subjectsList =
        await examinationSessionServices.getMappedSubjectsBySessionAndTerm(
          {
            examinationSessionId,
            selections,
            filterStatus: "needsScheduling",
          },
          options,
        );
      needsSchedulingCount = subjectsList.length;
    }
  }

  return {
    all: allCount,
    needsScheduling: needsSchedulingCount,
    roomPending: roomPendingCount,
    ready: readyCount,
    published: publishedCount,
  };
}

export async function getExaminationSessionSlotById(
  examinationSessionSlotId,
  options,
) {
  return await examinationSessionSlotRepository.getExaminationSessionSlotById(
    examinationSessionSlotId,
    options,
  );
}

export async function updateExaminationSessionSlots(
  { payloadArray, user },
  options = {},
) {
  return await sequelize.transaction(async (t) => {
    const results = [];
    for (const payload of payloadArray) {
      const existingSlot =
        await examinationSessionSlotRepository.getExaminationSessionSlotById(
          payload.examinationSessionSlotId,
          { transaction: t },
        );
      if (!existingSlot) continue;

      const updateData = {
        ...payload,
        updatedBy: user?.userId || null,
      };
      delete updateData.slotName;
      delete updateData.examinationSessionSlotId;

      if (payload.slotNumber !== undefined)
        updateData.slotNumber = Number(payload.slotNumber);
      if (payload.durationMinutes !== undefined)
        updateData.durationMinutes =
          payload.durationMinutes !== null
            ? Number(payload.durationMinutes)
            : null;

      const startTime =
        payload.startTime !== undefined
          ? payload.startTime
          : existingSlot.startTime;
      const durationMinutes =
        updateData.durationMinutes !== undefined
          ? updateData.durationMinutes
          : existingSlot.durationMinutes;

      if (payload.endTime === undefined && startTime && durationMinutes) {
        updateData.endTime = addMinutesToTime(startTime, durationMinutes);
      }

      const updated =
        await examinationSessionSlotRepository.updateExaminationSessionSlot(
          payload.examinationSessionSlotId,
          updateData,
          { ...options, transaction: t },
        );
      results.push(updated);
    }
    return results;
  });
}

export async function deleteExaminationSessionSlot(
  examinationSessionSlotId,
  options = {},
) {
  return await sequelize.transaction(async (t) => {
    return await examinationSessionSlotRepository.deleteExaminationSessionSlot(
      examinationSessionSlotId,
      { ...options, transaction: t },
    );
  });
}
