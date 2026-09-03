import * as faculityLoadRepository from "../repository/faculityLoadRepository.js";
import {
  decimalAdd,
  decimalDivide,
  toIntegerNumber,
  toMoneyNumber,
} from "../utility/decimalMoney.js";

function toDateOnlyString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday–Sunday of the week containing anchorDate (YYYY-MM-DD or today). */
export function getCurrentWeekRange(anchorDate) {
  const dateOnly = anchorDate || toDateOnlyString(new Date());
  const base = new Date(`${dateOnly}T00:00:00`);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: toDateOnlyString(monday),
    endDate: toDateOnlyString(sunday),
  };
}

/**
 * Supports:
 * - 24h: "10:31", "10:31:00"
 * - 12h: "10:31 am", "01:26 pm" (case-insensitive)
 */
function timeToMinutes(timeValue) {
  if (timeValue == null || timeValue === "") {
    return null;
  }

  const text = String(timeValue).trim().toLowerCase();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    hours = hours % 12;
    if (meridiem === "pm") {
      hours += 12;
    }
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

function classDurationMinutes(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes == null || endMinutes == null) {
    return 0;
  }
  if (endMinutes <= startMinutes) {
    return 0;
  }
  return endMinutes - startMinutes;
}

/**
 * Sum teaching minutes per userId for current-week date-wise classes.
 * Each (userId, timeTableCellDateWiseId) is counted once.
 */
export function buildWeeklyLoadHoursByUserId(dateWiseRows) {
  const minutesByUserId = new Map();
  const countedKeys = new Set();

  for (const row of dateWiseRows || []) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const dateWiseId = Number(plain.timeTableCellDateWiseId);
    const period =
      plain.timeTableCell && plain.timeTableCell.timeTablecreation
        ? plain.timeTableCell.timeTablecreation
        : null;
    const durationMinutes = classDurationMinutes(
      period ? period.startTime : null,
      period ? period.endTime : null,
    );
    if (!durationMinutes || !dateWiseId) {
      continue;
    }

    const teachers = plain.timeTableCellTeachersDateWise || [];
    for (const teacher of teachers) {
      const userId = Number(teacher.userId);
      if (!userId) {
        continue;
      }

      const key = `${userId}:${dateWiseId}`;
      if (countedKeys.has(key)) {
        continue;
      }
      countedKeys.add(key);

      const prev = minutesByUserId.has(userId)
        ? minutesByUserId.get(userId)
        : 0;
      minutesByUserId.set(userId, decimalAdd(prev, durationMinutes));
    }
  }

  const hoursByUserId = new Map();
  for (const [userId, totalMinutes] of minutesByUserId) {
    hoursByUserId.set(userId, decimalDivide(totalMinutes, 60));
  }
  return hoursByUserId;
}

function formatFaculityLoad(row, currentLoadOverride) {
  const plain = row.get ? row.get({ plain: true }) : row;
  if (!plain) {
    return plain;
  }

  const employee = plain.employee;
  const currentLoad =
    currentLoadOverride != null ? currentLoadOverride : plain.currentLoad;

  return {
    faculityLoadId: plain.faculityLoadId,
    employeeId: plain.employeeId,
    universityId: plain.universityId,
    instituteId: plain.instituteId,
    academicYearId: plain.academicYearId,
    userId: employee ? employee.userId : plain.userId,
    definedLoad:
      plain.definedLoad == null ? null : toIntegerNumber(plain.definedLoad),
    currentLoad: toMoneyNumber(currentLoad),
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
      if (!Number.isFinite(raw)) {
        throw new Error("Invalid currentLoad");
      }
      payload.currentLoad = toMoneyNumber(raw);
    }
  }

  return payload;
}

async function attachLiveWeeklyLoad(rows) {
  const userIds = [];
  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const userId = plain.employee ? plain.employee.userId : plain.userId;
    if (userId != null) {
      userIds.push(Number(userId));
    }
  }

  const week = getCurrentWeekRange();
  const dateWiseRows =
    await faculityLoadRepository.findPublishedWeekDateWiseTeacherPeriods(
      userIds,
      week.startDate,
      week.endDate,
    );
  const hoursByUserId = buildWeeklyLoadHoursByUserId(dateWiseRows);

  const data = [];
  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const userId = plain.employee ? plain.employee.userId : plain.userId;
    const weeklyLoad =
      userId != null ? hoursByUserId.get(Number(userId)) || 0 : 0;
    data.push(formatFaculityLoad(row, weeklyLoad));
  }

  return {
    startDate: week.startDate,
    endDate: week.endDate,
    data,
  };
}

export async function addFaculityLoad(data, createdBy, updatedBy) {
  const payload = normalizeLoadWritePayload(data);
  payload.createdBy = createdBy;
  payload.updatedBy = updatedBy;
  const result = await faculityLoadRepository.addFaculityLoad(payload);
  return formatFaculityLoad(result, 0);
}

export async function getFaculityLoadDetails(academicYearId) {
  const rows =
    await faculityLoadRepository.getFaculityLoadDetails(academicYearId);
  return attachLiveWeeklyLoad(rows);
}

export async function getSingleFaculityLoadDetails(userId) {
  const rows =
    await faculityLoadRepository.getSingleFaculityLoadDetails(userId);
  return attachLiveWeeklyLoad(rows);
}

export async function updateFaculityLoad(faculityLoadId, info, updatedBy) {
  try {
    const payload = normalizeLoadWritePayload(info);
    payload.updatedBy = updatedBy;
    return faculityLoadRepository.updateFaculityLoad(faculityLoadId, payload);
  } catch (error) {
    console.error("Error updating faculity load:", error);
    throw error.message === "Invalid currentLoad" ||
      error.message === "Invalid definedLoad"
      ? error
      : new Error("Failed to update time table");
  }
}

export async function deleteFaculityLoad(faculityLoadId) {
  return faculityLoadRepository.deleteFaculityLoad(faculityLoadId);
}

/**
 * Recompute and persist currentLoad for one faculty from current-week date-wise hours.
 */
export async function recomputeFaculityCurrentLoadHours(userId, transaction) {
  const userIdNum = Number(userId);
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    return [0];
  }

  const week = getCurrentWeekRange();
  const dateWiseRows =
    await faculityLoadRepository.findPublishedWeekDateWiseTeacherPeriods(
      [userIdNum],
      week.startDate,
      week.endDate,
      transaction,
    );
  const hoursByUserId = buildWeeklyLoadHoursByUserId(dateWiseRows);
  const weeklyLoad = hoursByUserId.get(userIdNum) || 0;

  return faculityLoadRepository.updateFaculityCurrentLoadByUserId(
    userIdNum,
    weeklyLoad,
    transaction,
  );
}
