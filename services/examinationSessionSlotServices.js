import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionSlotRepository from "../repository/examinationSessionSlotRepository.js";

function addMinutesToTime(timeStr, minutes) {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map(Number);
  let hours = parts[0] || 0;
  let mins = parts[1] || 0;
  let secs = parts[2] || 0;

  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor((totalMinutes / 60) % 24);
  const newMins = Math.floor(totalMinutes % 60);

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(newHours)}:${pad(newMins)}:${pad(secs)}`;
}

export async function createExaminationSessionSlot({ payload, user }, options = {}) {
  return await sequelize.transaction(async (t) => {
    const numberOfSlots = payload.numberOfSlots ? Number(payload.numberOfSlots) : 1;
    const durationMinutes = payload.durationMinutes !== undefined && payload.durationMinutes !== null ? Number(payload.durationMinutes) : null;
    const initialStartTime = payload.startTime || null;
    const initialSlotNumber = payload.slotNumber !== undefined && payload.slotNumber !== null ? Number(payload.slotNumber) : null;

    const createdSlots = [];
    let currentStartTime = initialStartTime;

    for (let i = 0; i < numberOfSlots; i++) {
      let currentEndTime = payload.endTime || null;

      if (currentStartTime && durationMinutes) {
        currentEndTime = addMinutesToTime(currentStartTime, durationMinutes);
      }

      const slotData = {
        examinationSessionId: Number(payload.examinationSessionId),
        slotNumber: initialSlotNumber !== null ? initialSlotNumber + i : null,
        slotName: payload.slotName || null,
        startTime: currentStartTime,
        endTime: currentEndTime,
        durationMinutes: durationMinutes,
        createdBy: user?.userId || null,
        updatedBy: user?.userId || null,
      };

      const newSlot = await examinationSessionSlotRepository.createExaminationSessionSlot(slotData, { ...options, transaction: t });
      createdSlots.push(newSlot);

      if (currentEndTime && durationMinutes) {
        currentStartTime = currentEndTime;
      }
    }

    return numberOfSlots === 1 ? createdSlots[0] : createdSlots;
  });
}

export async function getExaminationSessionSlots(examinationSessionId, options) {
  return await examinationSessionSlotRepository.getExaminationSessionSlots(examinationSessionId, options);
}

export async function getExaminationSessionSlotById(examinationSessionSlotId, options) {
  return await examinationSessionSlotRepository.getExaminationSessionSlotById(examinationSessionSlotId, options);
}

export async function updateExaminationSessionSlot({ examinationSessionSlotId, payload, user }, options = {}) {
  return await sequelize.transaction(async (t) => {
    const existingSlot = await examinationSessionSlotRepository.getExaminationSessionSlotById(examinationSessionSlotId, { transaction: t });

    const updateData = {
      ...payload,
      updatedBy: user?.userId || null,
    };
    if (payload.slotNumber !== undefined) updateData.slotNumber = payload.slotNumber !== null ? Number(payload.slotNumber) : null;
    if (payload.durationMinutes !== undefined) updateData.durationMinutes = payload.durationMinutes !== null ? Number(payload.durationMinutes) : null;

    const startTime = payload.startTime !== undefined ? payload.startTime : existingSlot?.startTime;
    const durationMinutes = updateData.durationMinutes !== undefined ? updateData.durationMinutes : existingSlot?.durationMinutes;

    if (payload.endTime === undefined && startTime && durationMinutes) {
      updateData.endTime = addMinutesToTime(startTime, durationMinutes);
    }

    return await examinationSessionSlotRepository.updateExaminationSessionSlot(
      examinationSessionSlotId,
      updateData,
      { ...options, transaction: t }
    );
  });
}

export async function deleteExaminationSessionSlot(examinationSessionSlotId, options = {}) {
  return await sequelize.transaction(async (t) => {
    return await examinationSessionSlotRepository.deleteExaminationSessionSlot(
      examinationSessionSlotId,
      { ...options, transaction: t }
    );
  });
}
