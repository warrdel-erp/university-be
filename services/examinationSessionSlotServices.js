import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionSlotRepository from "../repository/examinationSessionSlotRepository.js";

import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";

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
  let filterCombinations = [];
  if (selections && selections.length > 0) {
    const mappingIds = selections.map((s) => s.courseSessionMappingId);

    const dbMappings =
      await examinationSessionRepository.findSessionCourseMappingsByIds(
        mappingIds,
        options,
      );
    const dbMappingsMap = new Map(
      dbMappings.map((m) => [m.sessionCourseMappingId, m]),
    );

    for (const sel of selections) {
      const mapping = dbMappingsMap.get(sel.courseSessionMappingId);
      if (mapping) {
        filterCombinations.push({
          courseId: mapping.courseId,
          sessionId: mapping.sessionId,
          terms: sel.terms || [],
        });
      }
    }
  }

  return await examinationSessionSlotRepository.getExaminationSessionSlots(
    {
      examinationSessionId,
      date,
      filterCombinations,
      filterStatus,
      selections,
    },
    options,
  );
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
      delete updateData.examinationSessionSlotId; // prevent updating PK

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
