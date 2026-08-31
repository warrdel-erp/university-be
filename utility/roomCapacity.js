import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "./scoped.js";

/**
 * COUNT seats grouped by examScheduleRoomCapacityId.
 */
export async function getSeatCountsByCapacityIds(capacityIds, options = {}) {
  if (!capacityIds || capacityIds.length === 0) return [];

  return scoped(model.studentExamSeatModel).findAll({
    attributes: [
      "examScheduleRoomCapacityId",
      [fn("COUNT", col("student_exam_seat_id")), "studentCount"],
    ],
    where: {
      examScheduleRoomCapacityId: { [Op.in]: capacityIds },
      ...buildScope(model.studentExamSeatModel),
    },
    group: ["examScheduleRoomCapacityId"],
    raw: true,
    transaction: options.transaction,
  });
}

/**
 * SUM allocated capacity grouped by examScheduleId.
 */
export async function getAllocatedCapacityByExamScheduleIds(
  examScheduleIds,
  options = {},
) {
  if (!examScheduleIds || examScheduleIds.length === 0) return [];

  return scoped(model.examScheduleRoomCapacityModel).findAll({
    where: { examScheduleId: { [Op.in]: examScheduleIds } },
    attributes: [
      "examScheduleId",
      [fn("SUM", col("capacity")), "capacity"],
    ],
    group: ["examScheduleId"],
    raw: true,
    transaction: options.transaction,
  });
}

/**
 * Derive room planning flags from allocated capacity vs cohort student count.
 */
export function deriveScheduleRoomFlags({
  roomCapacity,
  studentCount,
  published = false,
  hasSchedule = true,
  requireUnpublishedForReady = true,
}) {
  const allocated = Number(roomCapacity) || 0;
  const students = Number(studentCount) || 0;
  const hasAssignedRoom = allocated > 0;
  const roomPending =
    hasSchedule && (!hasAssignedRoom || allocated < students);
  const ready =
    hasSchedule &&
    (!requireUnpublishedForReady || !published) &&
    allocated >= students;

  return {
    hasAssignedRoom,
    roomCapacity: allocated,
    roomPending,
    needsRoom: false,
    ready,
    confirmed: hasAssignedRoom && allocated === students,
  };
}

/**
 * Build a Map(examScheduleRoomCapacityId -> studentCount) from seat count rows.
 */
export function seatCountMapFromRows(rows) {
  const map = new Map();
  for (const row of rows || []) {
    map.set(
      Number(row.examScheduleRoomCapacityId),
      parseInt(row.studentCount, 10) || 0,
    );
  }
  return map;
}

/**
 * Build a Map(examScheduleId -> summed capacity) from capacity aggregate rows.
 */
export function capacityMapFromRows(rows) {
  const map = new Map();
  for (const row of rows || []) {
    map.set(Number(row.examScheduleId), parseInt(row.capacity, 10) || 0);
  }
  return map;
}
