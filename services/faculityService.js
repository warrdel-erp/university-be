import * as faculityLoadRepository from "../repository/faculityLoadRepository.js";
import { parseMoneyInput, toMoneyNumber } from "../utility/decimalMoney.js";

function formatFaculityLoad(row) {
  const plain = row?.get ? row.get({ plain: true }) : row;
  if (!plain) return plain;

  const { employee, employeeFaculity, ...rest } = plain;
  return {
    ...rest,
    userId: employee?.userId || rest.userId, // map employee's userId back to the root level
    definedLoad: rest.definedLoad == null ? null : Math.trunc(Number(rest.definedLoad)),
    currentLoad: toMoneyNumber(rest.currentLoad),
    ...(employee ? { employee } : {}),
    ...(employeeFaculity ? { employeeFaculity } : {}),
  };
}

function normalizeLoadWritePayload(data) {
  const payload = { ...data };

  if ("definedLoad" in payload && payload.definedLoad != null) {
    const definedLoad = Number(payload.definedLoad);
    if (!Number.isFinite(definedLoad) || Math.trunc(definedLoad) !== definedLoad) {
      throw new Error("Invalid definedLoad");
    }
    payload.definedLoad = Math.trunc(definedLoad);
  }

  if ("currentLoad" in payload) {
    const parsed = parseMoneyInput(payload.currentLoad);
    payload.currentLoad = parsed == null ? 0 : parsed;
    if (Number.isNaN(payload.currentLoad)) {
      throw new Error("Invalid currentLoad");
    }
  }

  return payload;
}

export async function addFaculityLoad(data, createdBy, updatedBy) {
  const payload = normalizeLoadWritePayload(data);
  payload.createdBy = createdBy;
  payload.updatedBy = updatedBy;
  const result = await faculityLoadRepository.addFaculityLoad(payload);
  return formatFaculityLoad(result);
}

export async function getFaculityLoadDetails() {
  const rows = await faculityLoadRepository.getFaculityLoadDetails();
  return rows.map(formatFaculityLoad);
}

export async function getSingleFaculityLoadDetails(userId) {
  const rows = await faculityLoadRepository.getSingleFaculityLoadDetails(userId);
  return rows.map(formatFaculityLoad);
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
