import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import { doTimeSlotsOverlap, getTimeSlotRange } from "../utility/timeSlot.js";

async function assertScopedExamSchedule(examScheduleId, options = {}) {
  const { transaction, attributes = ['examScheduleId'] } = options;
  return scoped(model.examScheduleModel).findOne({
    where: { examScheduleId },
    attributes,
    transaction,
  });
}

async function assertScopedRoomCapacity(examScheduleRoomCapacityId, transaction) {
  return model.examScheduleRoomCapacityModel.findOne({
    where: { examScheduleRoomCapacityId },
    attributes: ['examScheduleRoomCapacityId', 'examScheduleId'],
    transaction,
    include: [{
      model: model.examScheduleModel,
      as: 'examSchedule',
      required: true,
      where: buildScope(model.examScheduleModel),
      attributes: ['examScheduleId'],
    }],
  });
}

const activeRoomHierarchyInclude = () => ({
  model: model.floorModel,
  as: "roomFloor",
  attributes: [],
  required: true,
  paranoid: true,
  include: [
    {
      model: model.buildingModel,
      as: "floorBuilding",
      attributes: [],
      required: true,
      paranoid: true,
      include: [
        {
          model: model.campusModel,
          as: "campusbuilding",
          attributes: [],
          required: true,
          paranoid: true,
          where: buildScope(model.campusModel),
        },
      ],
    },
  ],
});

function getScheduleRange(schedule) {
  const slot = schedule.examSchedule?.examinationSessionSlot;
  return getTimeSlotRange({
    startTime: slot?.startTime || schedule.examSchedule?.examTime,
    endTime: slot?.endTime,
    duration: slot?.durationMinutes ?? schedule.examSchedule?.duration,
  });
}

function isOverlappingSchedule(schedule, startMinutes, endMinutes) {
  return doTimeSlotsOverlap(getScheduleRange(schedule), { startMinutes, endMinutes });
}

export async function findOccupiedRoomIdsByClassSchedule(day, startTime, endTime, examDate) {
  const targetRange = getTimeSlotRange({ startTime, endTime });
  if (!targetRange) return [];

  const dateCells = await model.timeTableCellDateWiseModel.findAll({
    where: { 
      date: examDate,
      classRoomSectionId: { [Op.not]: null }
    },
    attributes: ['classRoomSectionId'],
    include: [{
      model: model.timeTableCellModel,
      as: 'timeTableCell',
      attributes: ['timeTableCellId'],
      required: true,
      include: [{
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        attributes: ['startTime', 'endTime'],
        required: true,
      }]
    }],
    raw: true,
  });

  const busyRoomIds = new Set();
  for (const row of dateCells) {
    const periodStart = row['timeTableCell.timeTablecreation.startTime'];
    const periodEnd = row['timeTableCell.timeTablecreation.endTime'];
    const periodRange = getTimeSlotRange({ startTime: periodStart, endTime: periodEnd });
    
    if (periodRange && doTimeSlotsOverlap(targetRange, periodRange)) {
      busyRoomIds.add(row.classRoomSectionId);
    }
  }

  return [...busyRoomIds];
}

export async function addExamRoomCapacity(data, transaction) {
  const schedule = await assertScopedExamSchedule(data.examScheduleId, { transaction });
  if (!schedule) {
    throw new Error('Exam schedule not found');
  }
  return await model.examScheduleRoomCapacityModel.create(data, { transaction });
}

export async function bulkAddExamRoomCapacity(data, transaction) {
  if (data?.length) {
    const schedule = await assertScopedExamSchedule(data[0].examScheduleId, { transaction });
    if (!schedule) {
      throw new Error('Exam schedule not found');
    }
  }
  return await model.examScheduleRoomCapacityModel.bulkCreate(data, { transaction });
}

export async function updateExamRoomCapacity(examScheduleRoomCapacityId, data, transaction) {
  const capacity = await assertScopedRoomCapacity(examScheduleRoomCapacityId, transaction);
  if (!capacity) {
    throw new Error('Exam schedule room capacity not found');
  }
  await model.examScheduleRoomCapacityModel.update(data, {
    where: { examScheduleRoomCapacityId },
    transaction,
  });
  return true;
}

export async function deleteExamRoomCapacity(examScheduleRoomCapacityId, transaction) {
  const capacity = await assertScopedRoomCapacity(examScheduleRoomCapacityId, transaction);
  if (!capacity) {
    return 0;
  }
  return await model.examScheduleRoomCapacityModel.destroy({
    where: { examScheduleRoomCapacityId },
    transaction,
  });
}

export async function getExamRoomCapacityById(examScheduleRoomCapacityId) {
  return await assertScopedRoomCapacity(examScheduleRoomCapacityId);
}

export async function getRoomsByExamScheduleId(examScheduleId) {
  const schedule = await assertScopedExamSchedule(examScheduleId);
  if (!schedule) {
    return [];
  }
  const rows = await model.examScheduleRoomCapacityModel.findAll({
    where: { examScheduleId },
    attributes: [
      "examScheduleRoomCapacityId",
      "examScheduleId",
      "classRoomSectionId",
      "capacity",
      "columns",
      "orderKey",
    ],
    include: [
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: [
          "classRoomSectionId",
          "roomNumber",
          "capacity",
          "examCapacity",
          "examCapacityColumns",
        ],
        required: true,
        paranoid: true,
      },
    ],
    order: [["orderKey", "ASC"]],
  });

  return rows.map((row) => {
    const plain = row.get({ plain: true });
    return {
      examScheduleRoomCapacityId: plain.examScheduleRoomCapacityId,
      examScheduleId: plain.examScheduleId,
      classRoomSectionId: plain.classRoomSectionId,
      capacity: plain.capacity,
      columns: plain.columns,
      orderKey: plain.orderKey,
      classRoom: plain.classRoom ?? null,
    };
  });
}

export async function getExamScheduleSlot(examScheduleId) {
  return await scoped(model.examScheduleModel).findByPk(examScheduleId, {
    attributes: ["examScheduleId", "examDate", "examTime", "duration", "examinationSessionSlotId"],
    include: [
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: ["examinationSessionSlotId", "startTime", "endTime", "durationMinutes"],
        required: false,
        paranoid: true,
      },
    ],
    paranoid: true,
    nest: true,
    raw: true,
  });
}

async function findOverlappingExamBusyRoomIds(examDate, excludeExamScheduleId, startMinutes, endMinutes) {
  const rows = await model.examScheduleRoomCapacityModel.findAll({
    attributes: ["classRoomSectionId"],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examTime", "duration"],
        required: true,
        paranoid: true,
        include: [
          {
            model: model.examinationSessionSlotModel,
            as: "examinationSessionSlot",
            attributes: ["startTime", "endTime", "durationMinutes"],
            required: false,
            paranoid: true,
          },
        ],
        where: {
          ...buildScope(model.examScheduleModel),
          examDate,
          examScheduleId: { [Op.ne]: excludeExamScheduleId },
        },
      },
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: [],
        required: true,
        paranoid: true,
        include: [activeRoomHierarchyInclude()],
      },
    ],
  });

  return rows
    .map((row) => row.get({ plain: true }))
    .filter((row) => isOverlappingSchedule(row, startMinutes, endMinutes))
    .map((row) => row.classRoomSectionId);
}



async function findAssignedRoomIdsForExam(examScheduleId) {
  const rows = await model.examScheduleRoomCapacityModel.findAll({
    attributes: ["classRoomSectionId"],
    where: { examScheduleId },
    raw: true,
  });

  return rows.map((row) => row.classRoomSectionId);
}

async function findAvailableRoomsForExamSlot(busyRoomIds) {
  const where = {};
  if (busyRoomIds.length) {
    where.classRoomSectionId = { [Op.notIn]: busyRoomIds };
  }

  const rooms = await scoped(model.classRoomModel).findAll({
    where,
    attributes: [
      "classRoomSectionId",
      "roomNumber",
      "capacity",
      "examCapacity",
      "examCapacityColumns",
    ],
    paranoid: true,
    include: [activeRoomHierarchyInclude()],
    order: [["roomNumber", "ASC"]],
    raw: true,
  });

  return rooms.map((room) => ({
    ...room,
    effectiveExamCapacity: room.examCapacity ?? room.capacity,
  }));
}

// New helper to fetch *all* rooms for the exam slot without filtering out busy rooms
async function findAllRoomsForExamSlot() {
  const rooms = await scoped(model.classRoomModel).findAll({
    attributes: [
      "classRoomSectionId",
      "roomNumber",
      "capacity",
      "examCapacity",
      "examCapacityColumns",
    ],
    paranoid: true,
    include: [activeRoomHierarchyInclude()],
    order: [["roomNumber", "ASC"]],
    raw: true,
  });

  return rooms.map((room) => ({
    ...room,
    effectiveExamCapacity: room.examCapacity ?? room.capacity,
  }));
}

// Helper to fetch rooms for allocation lookup by IDs
export async function getRoomsForAllocationLookup(classRoomSectionIds) {
  const rooms = await scoped(model.classRoomModel).findAll({
    where: { classRoomSectionId: classRoomSectionIds },
    attributes: [
      "classRoomSectionId",
      "roomNumber",
      "capacity",
      "examCapacity",
      "examCapacityColumns",
    ],
    paranoid: true,
    include: [activeRoomHierarchyInclude()],
    raw: true,
  });

  const roomMap = new Map();
  rooms.forEach((room) => {
    roomMap.set(room.classRoomSectionId, {
      ...room,
      effectiveExamCapacity: room.examCapacity ?? room.capacity,
    });
  });
  return roomMap;
}

export async function getAvailableRoomsPayload(examScheduleId, examSchedule, slot) {
  const { examDate, day, startTime, endTime, startMinutes, endMinutes } = {
    examDate: examSchedule.examDate,
    ...slot,
  };

  const [classBusyRoomIds, assignedRoomIds, overlappingExamRoomIds] = await Promise.all([
    findOccupiedRoomIdsByClassSchedule(day, startTime, endTime, examDate),
    findAssignedRoomIdsForExam(examScheduleId),
    findOverlappingExamBusyRoomIds(examDate, examScheduleId, startMinutes, endMinutes),
  ]);

  const busyRoomIds = [...new Set([...classBusyRoomIds, ...assignedRoomIds, ...overlappingExamRoomIds])];
  // Retrieve all rooms (including busy ones) and mark conflict flag
  const allRooms = await findAllRoomsForExamSlot();
  const roomsWithConflict = allRooms.map((room) => ({
    ...room,
    conflict: busyRoomIds.includes(room.classRoomSectionId),
  }));
  return {
    examScheduleId: examSchedule.examScheduleId,
    examDate: examSchedule.examDate,
    examTime: examSchedule.examTime,
    duration: examSchedule.duration,
    examinationSessionSlotId: examSchedule.examinationSessionSlotId,
    examinationSessionSlot: examSchedule.examinationSessionSlot,
    slotStartTime: startTime,
    slotEndTime: endTime,
    day,
    rooms: roomsWithConflict,
  };


}
