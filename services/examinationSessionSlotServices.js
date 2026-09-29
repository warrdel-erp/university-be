import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionSlotRepository from "../repository/examinationSessionSlotRepository.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import * as examinationSessionServices from "./examinationSessionServices.js";
import {
  lookupStudentCount,
  buildStudentGroupFromSchedule,
} from "../utility/studentCount.js";
import { getStudentCountMapByGroups } from "./studentCountServices.js";
import { deriveScheduleRoomFlags } from "../utility/roomCapacity.js";
import { EXAM_SCHEDULE_FILTER_STATUS } from "../constant.js";
import { resolveSelectionCombinations } from "../utility/examScheduleSelection.js";

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

async function resolveMissingScheduleMappings(schedules, examinationSessionId, options = {}) {
  const missingSubjectIds = [];
  for (const s of schedules) {
    if (!s.batchId || !s.curriculumSubjectTermMappingId) {
      if (s.subjectId) missingSubjectIds.push(Number(s.subjectId));
    }
  }
  if (!missingSubjectIds.length) return new Map();

  const sessionTerms = await examinationSessionRepository.findExaminationSessionTerms(
    Number(examinationSessionId),
    options,
  );
  const sessionIds = sessionTerms.map((t) => t.sessionId).filter(Boolean);

  const mappings = await examinationSessionRepository.findAssessmentPlanSubjectMappings(
    {
      subjectId: missingSubjectIds,
      sessionId: sessionIds.length ? sessionIds : undefined,
    },
    options,
  );

  const fallbackMap = new Map();
  for (const m of mappings) {
    const plain = m.get ? m.get({ plain: true }) : m;
    const sId = plain.subjectId || plain.curriculumSubjectTermMapping?.subjectId;
    if (sId && !fallbackMap.has(Number(sId))) {
      fallbackMap.set(Number(sId), {
        batchId: plain.batchId || plain.batch?.batchId || null,
        curriculumSubjectTermMappingId:
          plain.curriculumSubjectTermMappingId ||
          plain.curriculumSubjectTermMapping?.curriculumSubjectTermMappingId ||
          null,
        term: plain.curriculumSubjectTermMapping?.term || null,
        sessionId: plain.batch?.sessionId || null,
        sessionName: plain.batch?.session?.sessionName || null,
      });
    }
  }
  return fallbackMap;
}

function buildScheduleRow(item, studentCount, fallbackMap = new Map()) {
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

  const fallback = fallbackMap.get(Number(item.subjectId)) || {};

  const batchId =
    item.batchId ??
    item.batch?.batchId ??
    fallback.batchId ??
    null;
  const curriculumSubjectTermMappingId =
    item.curriculumSubjectTermMappingId ??
    item.curriculumSubjectTermMapping?.curriculumSubjectTermMappingId ??
    fallback.curriculumSubjectTermMappingId ??
    null;
  const term =
    item.curriculumSubjectTermMapping?.term ??
    item.term ??
    fallback.term ??
    null;
  const sessionId =
    item.batch?.sessionId ??
    item.batch?.session?.sessionId ??
    fallback.sessionId ??
    null;
  const sessionName =
    item.batch?.session?.sessionName ??
    fallback.sessionName ??
    null;
  const curriculumSubjectTermMapping =
    item.curriculumSubjectTermMapping ||
    (curriculumSubjectTermMappingId
      ? {
          curriculumSubjectTermMappingId,
          term,
          subjectId: item.subjectId,
        }
      : null);

  return {
    ...schedule,
    batchId,
    curriculumSubjectTermMappingId,
    curriculumBatchTermMappingId: curriculumSubjectTermMappingId,
    curriculumSubjectTermMapping,
    term,
    sessionId,
    sessionName,
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

function resolveSlotPublished(schedules) {
  if (!schedules.length) return false;
  for (const schedule of schedules) {
    if (!schedule.published) return false;
  }
  return true;
}

async function loadEnrichedSlotSchedules(
  { examinationSessionId, date, selections },
  options = {},
) {
  const filterCombinations = selections?.length
    ? await resolveSelectionCombinations(selections, options)
    : [];

  const slotRows = await examinationSessionSlotRepository.findSlotsWithSchedules(
    { examinationSessionId, date, filterCombinations },
    options,
  );

  const slots = slotRows.map((slotRow) => {
    const slot = slotRow.get ? slotRow.get({ plain: true }) : slotRow;
    const schedules = slot.examSchedules || [];
    delete slot.examSchedules;
    slot.schedules = schedules;
    return slot;
  });

  const allSchedules = slots.flatMap((s) => s.schedules);
  const studentGroups = allSchedules
    .map((schedule) => buildStudentGroupFromSchedule(schedule))
    .filter(Boolean);

  const [studentCountMap, fallbackMap] = await Promise.all([
    getStudentCountMapByGroups(studentGroups, options),
    resolveMissingScheduleMappings(allSchedules, examinationSessionId, options),
  ]);

  for (const slot of slots) {
    slot.schedules = slot.schedules.map((schedule) => {
      const studentCount = lookupStudentCount(
        studentCountMap,
        buildStudentGroupFromSchedule(schedule),
      );
      return buildScheduleRow(schedule, studentCount, fallbackMap);
    });
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
    const cstmId =
      sub.curriculumSubjectTermMappingId ??
      sub.curriculumBatchTermMappingId ??
      null;
    const batchId = sub.batchId ?? null;
    const curriculumSubjectTermMapping =
      sub.curriculumSubjectTermMapping ||
      (cstmId
        ? {
            curriculumSubjectTermMappingId: cstmId,
            term: sub.term,
            subjectId: sub.subjectId,
          }
        : null);

    unscheduled.push({
      examScheduleId: null,
      examinationSessionId: Number(examinationSessionId),
      subjectId: sub.subjectId,
      batchId,
      curriculumSubjectTermMappingId: cstmId,
      curriculumBatchTermMappingId: cstmId,
      curriculumSubjectTermMapping,
      term: sub.term,
      sessionId: sub.sessionId,
      sessionName: sub.sessionName || null,
      examDate: null,
      examTime: null,
      type: null,
      duration: null,
      examinationSessionSlotId: null,
      subjectSchedule: {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName || null,
        subjectCode: sub.subjectCode || null,
        courseId: sub.courseId || null,
        term: sub.term,
        courseInfo: {
          courseName: sub.courseName || null,
          termType: sub.termType || null,
        },
      },
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
  if (filterStatus === EXAM_SCHEDULE_FILTER_STATUS.NEEDS_SCHEDULING) {
    const [slotRows, unscheduled] = await Promise.all([
      examinationSessionSlotRepository.findSlotsWithoutSchedules({ examinationSessionId }, options),
      buildUnscheduledSchedules({ examinationSessionId, selections }, options),
    ]);

    return slotRows.map((slotRow) => {
      const slot = slotRow.get ? slotRow.get({ plain: true }) : slotRow;
      return {
        ...slot,
        published: false,
        schedules: [...unscheduled],
      };
    });
  }

  const includeUnscheduled = !filterStatus || filterStatus === EXAM_SCHEDULE_FILTER_STATUS.ALL;
  const [{ slots }, unscheduled] = await Promise.all([
    loadEnrichedSlotSchedules({ examinationSessionId, date, selections }, options),
    includeUnscheduled
      ? buildUnscheduledSchedules({ examinationSessionId, selections }, options)
      : Promise.resolve([]),
  ]);

  const result = slots.map((slot, index) => {
    const schedules = slot.schedules.filter((sch) => matchesFilterStatus(sch, filterStatus));
    if (includeUnscheduled && index === 0) {
      schedules.push(...unscheduled);
    }
    return {
      ...slot,
      published: resolveSlotPublished(slot.schedules),
      schedules,
    };
  });

  if (includeUnscheduled && slots.length === 0 && unscheduled.length > 0) {
    result.push({
      examinationSessionSlotId: null,
      examinationSessionId: Number(examinationSessionId),
      published: false,
      schedules: unscheduled,
    });
  }

  return result;
}

export async function getExaminationSessionSlotsCount(
  { examinationSessionId, date, selections },
  options = {},
) {
  const [{ slots }, unscheduled] = await Promise.all([
    loadEnrichedSlotSchedules({ examinationSessionId, date, selections }, options),
    buildUnscheduledSchedules({ examinationSessionId, selections }, options),
  ]);

  let roomPendingCount = 0;
  let readyCount = 0;
  let publishedCount = 0;

  const scheduledList = slots.flatMap((s) => s.schedules);
  for (const schedule of scheduledList) {
    if (schedule.published) {
      publishedCount++;
    } else {
      if (schedule.roomPending) roomPendingCount++;
      if (schedule.ready) readyCount++;
    }
  }

  const needsSchedulingCount = unscheduled.length;
  const allCount = scheduledList.length + needsSchedulingCount;

  return {
    all: allCount,
    needsScheduling: needsSchedulingCount,
    roomPending: roomPendingCount,
    ready: readyCount,
    published: publishedCount,
  };
}

export async function getExaminationSessionSlotById(
  { examinationSessionId, examinationSessionSlotId },
  options,
) {
  return examinationSessionSlotRepository.getExaminationSessionSlotById(
    {
      examinationSessionId,
      examinationSessionSlotId,
    },
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
