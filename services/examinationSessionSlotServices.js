import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionSlotRepository from "../repository/examinationSessionSlotRepository.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import * as examinationSessionServices from "./examinationSessionServices.js";
import {
  getStudentCountMapByGroups,
  lookupStudentCount,
} from "../utility/studentCount.js";
import { deriveScheduleRoomFlags } from "../utility/roomCapacity.js";
import { EXAM_SCHEDULE_FILTER_STATUS } from "../constant.js";

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

async function resolveSelectionFilters(selections, options = {}) {
  const filterCombinations = [];
  if (!selections || selections.length === 0) {
    return filterCombinations;
  }

  const mappingIds = [];
  for (const sel of selections) {
    mappingIds.push(sel.courseSessionMappingId);
  }

  const dbMappings =
    await examinationSessionRepository.findSessionCourseMappingsByIds(
      mappingIds,
      options,
    );
  const dbMappingsMap = new Map();
  for (const mapping of dbMappings) {
    dbMappingsMap.set(mapping.sessionCourseMappingId, mapping);
  }

  for (const sel of selections) {
    const mapping = dbMappingsMap.get(sel.courseSessionMappingId);
    if (!mapping) continue;
    filterCombinations.push({
      courseId: mapping.courseId,
      sessionId: mapping.sessionId,
      terms: sel.terms || [],
    });
  }

  return filterCombinations;
}

function studentGroupFromSchedule(item) {
  const courseId = item.subjectSchedule?.courseId;
  const term = item.term ?? item.subjectSchedule?.term;
  const academicYearId =
    item.academicYearId ?? item.subjectSchedule?.academicYearId;
  const sessionId = item.sessionId;

  if (
    sessionId == null ||
    courseId == null ||
    term == null ||
    academicYearId == null
  ) {
    return null;
  }
  return { sessionId, courseId, term, academicYearId };
}

function buildScheduleRow(item, studentCount) {
  const roomNumbers = [];
  let roomCapacity = 0;
  const roomCapacities = item.roomCapacities || [];
  for (const room of roomCapacities) {
    roomNumbers.push(room.classRoom?.roomNumber);
    roomCapacity += Number(room.capacity || 0);
  }

  const published = item.published || false;
  const flags = deriveScheduleRoomFlags({
    roomCapacity,
    studentCount,
    published,
    hasSchedule: true,
  });
  const { roomCapacities: _rooms, ...schedule } = item;

  return {
    ...schedule,
    studentCount,
    courseName: item.subjectSchedule?.courseInfo?.courseName || null,
    termType: item.subjectSchedule?.courseInfo?.termType || null,
    roomNumbers,
    roomCapacity: flags.roomCapacity,
    needsScheduling: false,
    published,
    roomPending: flags.roomPending,
    needsRoom: flags.needsRoom,
    ready: flags.ready,
  };
}

function matchesFilterStatus(schedule, filterStatus) {
  if (!filterStatus || filterStatus === EXAM_SCHEDULE_FILTER_STATUS.ALL) return true;
  if (filterStatus === EXAM_SCHEDULE_FILTER_STATUS.NEEDS_SCHEDULING) return false;
  return schedule[filterStatus] === true;
}

async function loadEnrichedSlotSchedules(
  { examinationSessionId, date, selections },
  options = {},
) {
  const filterCombinations = await resolveSelectionFilters(selections, options);

  const slotRows =
    await examinationSessionSlotRepository.findSlotsWithSchedules(
      { examinationSessionId, date, filterCombinations },
      options,
    );

  const slots = [];
  const studentGroups = [];

  for (const slotRow of slotRows) {
    const slot = slotRow.get({ plain: true });
    const schedules = slot.examSchedules || [];
    slot.examSchedules = undefined;
    slot.schedules = schedules;
    slots.push(slot);

    for (const schedule of schedules) {
      const group = studentGroupFromSchedule(schedule);
      if (group) studentGroups.push(group);
    }
  }

  const studentCountMap = await getStudentCountMapByGroups(
    studentGroups,
    options,
  );

  for (const slot of slots) {
    const enriched = [];
    for (const schedule of slot.schedules) {
      const studentCount = lookupStudentCount(
        studentCountMap,
        studentGroupFromSchedule(schedule),
      );
      enriched.push(buildScheduleRow(schedule, studentCount));
    }
    slot.schedules = enriched;
  }

  return { slots, filterCombinations };
}

export async function createExaminationSessionSlot(
  { payload, user },
  options = {},
) {
  return sequelize.transaction(async (t) => {
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

async function buildUnscheduledSchedules(
  { examinationSessionId, selections },
  options = {},
) {
  const subjectsList =
    await examinationSessionServices.getMappedSubjectsBySessionAndTerm(
      {
        examinationSessionId,
        selections,
        filterStatus: EXAM_SCHEDULE_FILTER_STATUS.NEEDS_SCHEDULING,
      },
      options,
    );

  const unscheduled = [];
  for (const sub of subjectsList) {
    unscheduled.push({
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
  return unscheduled;
}

export async function getExaminationSessionSlots(
  { examinationSessionId, date, selections, filterStatus },
  options = {},
) {
  // Unscheduled-only list does not need room/student enrichment on existing schedules.
  if (filterStatus === EXAM_SCHEDULE_FILTER_STATUS.NEEDS_SCHEDULING) {
    const slotRows =
      await examinationSessionSlotRepository.findSlotsWithoutSchedules(
        { examinationSessionId },
        options,
      );

    const unscheduled = await buildUnscheduledSchedules(
      { examinationSessionId, selections },
      options,
    );

    const result = [];
    for (const slotRow of slotRows) {
      const slot = slotRow.get ? slotRow.get({ plain: true }) : slotRow;
      result.push({
        ...slot,
        schedules: [...unscheduled],
      });
    }
    return result;
  }

  const { slots } = await loadEnrichedSlotSchedules(
    { examinationSessionId, date, selections },
    options,
  );

  // filterStatus=all also includes subjects that still need scheduling.
  const includeUnscheduled =
    !filterStatus || filterStatus === EXAM_SCHEDULE_FILTER_STATUS.ALL;
  const unscheduled = includeUnscheduled
    ? await buildUnscheduledSchedules(
        { examinationSessionId, selections },
        options,
      )
    : [];

  const result = [];
  for (const slot of slots) {
    const schedules = [];
    for (const schedule of slot.schedules) {
      if (matchesFilterStatus(schedule, filterStatus)) {
        schedules.push(schedule);
      }
    }
    if (includeUnscheduled) {
      for (const subject of unscheduled) {
        schedules.push(subject);
      }
    }
    result.push({
      ...slot,
      schedules,
    });
  }

  return result;
}

export async function getExaminationSessionSlotsCount(
  { examinationSessionId, date, selections },
  options = {},
) {
  const { slots } = await loadEnrichedSlotSchedules(
    { examinationSessionId, date, selections },
    options,
  );

  let allCount = 0;
  let roomPendingCount = 0;
  let readyCount = 0;
  let publishedCount = 0;

  for (const slot of slots) {
    for (const schedule of slot.schedules) {
      allCount++;
      if (schedule.published) {
        publishedCount++;
        continue;
      }
      if (schedule.roomPending) roomPendingCount++;
      if (schedule.ready) readyCount++;
    }
  }

  const unscheduled = await buildUnscheduledSchedules(
    { examinationSessionId, selections },
    options,
  );
  const needsSchedulingCount = unscheduled.length;
  allCount += needsSchedulingCount;

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
  return examinationSessionSlotRepository.getExaminationSessionSlotById(
    examinationSessionSlotId,
    options,
  );
}

export async function updateExaminationSessionSlots(
  { payloadArray, user },
  options = {},
) {
  return sequelize.transaction(async (t) => {
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

      if (payload.slotNumber !== undefined) {
        updateData.slotNumber = Number(payload.slotNumber);
      }
      if (payload.durationMinutes !== undefined) {
        updateData.durationMinutes =
          payload.durationMinutes !== null
            ? Number(payload.durationMinutes)
            : null;
      }

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
  return sequelize.transaction(async (t) => {
    return examinationSessionSlotRepository.deleteExaminationSessionSlot(
      examinationSessionSlotId,
      { ...options, transaction: t },
    );
  });
}
