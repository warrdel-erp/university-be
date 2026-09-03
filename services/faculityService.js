import * as faculityLoadRepository from "../repository/faculityLoadRepository.js";
import { toIntegerNumber } from "../utility/decimalMoney.js";

function formatFaculityLoad(row, currentLoadOverride) {
  const plain = row.get ? row.get({ plain: true }) : row;
  if (!plain) {
    return plain;
  }

  const employee = plain.employee;
  const currentLoad = currentLoadOverride != null
    ? currentLoadOverride
    : plain.currentLoad;

  return {
    faculityLoadId: plain.faculityLoadId,
    employeeId: plain.employeeId,
    universityId: plain.universityId,
    instituteId: plain.instituteId,
    academicYearId: plain.academicYearId,
    userId: employee ? employee.userId : plain.userId,
    definedLoad: plain.definedLoad == null ? null : toIntegerNumber(plain.definedLoad),
    currentLoad: toIntegerNumber(currentLoad),
    employee: employee || undefined,
  };
}

function normalizeLoadWritePayload(data) {
  const payload = { ...data };

  if ("definedLoad" in payload && payload.definedLoad != null) {
    const raw = Number(payload.definedLoad);
    if (!Number.isFinite(raw) || Math.trunc(raw) !== raw) {
      throw new Error("Invalid definedLoad");
    }
    payload.definedLoad = toIntegerNumber(raw);
  }

  if ("currentLoad" in payload) {
    if (payload.currentLoad == null || payload.currentLoad === "") {
      payload.currentLoad = 0;
    } else {
      const raw = Number(payload.currentLoad);
      if (!Number.isFinite(raw) || Math.trunc(raw) !== raw) {
        throw new Error("Invalid currentLoad");
      }
      payload.currentLoad = toIntegerNumber(raw);
    }
  }

  return payload;
}

async function attachLiveClassCounts(rows) {
  const userIds = [];
  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const userId = plain.employee ? plain.employee.userId : plain.userId;
    if (userId != null) {
      userIds.push(Number(userId));
    }
  }

  const counts = await faculityLoadRepository.countPublishedDateWiseClassesByUserIds(userIds);
  const formatted = [];
  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const userId = plain.employee ? plain.employee.userId : plain.userId;
    const classCount = userId != null ? (counts.get(Number(userId)) || 0) : 0;
    formatted.push(formatFaculityLoad(row, classCount));
  }
  return formatted;
}

export async function addFaculityLoad(data, createdBy, updatedBy) {
  const payload = normalizeLoadWritePayload(data);
  payload.createdBy = createdBy;
  payload.updatedBy = updatedBy;
  const result = await faculityLoadRepository.addFaculityLoad(payload);
  return formatFaculityLoad(result, 0);
}

export async function getFaculityLoadDetails(academicYearId) {
  const rows = await faculityLoadRepository.getFaculityLoadDetails(academicYearId);
  return attachLiveClassCounts(rows);
}

export async function getSingleFaculityLoadDetails(userId) {
  const rows = await faculityLoadRepository.getSingleFaculityLoadDetails(userId);
  return attachLiveClassCounts(rows);
}

export async function updateFaculityLoad(faculityLoadId, info, updatedBy) {
  try {
    const payload = normalizeLoadWritePayload(info);
    payload.updatedBy = updatedBy;
    return faculityLoadRepository.updateFaculityLoad(faculityLoadId, payload);
  } catch (error) {
    console.error("Error updating faculity load:", error);
    throw error.message === "Invalid currentLoad" || error.message === "Invalid definedLoad"
      ? error
      : new Error("Failed to update time table");
  }
}

export async function deleteFaculityLoad(faculityLoadId) {
  return faculityLoadRepository.deleteFaculityLoad(faculityLoadId);
}
