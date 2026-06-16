import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";

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
      model: model.examScheduleModel.unscoped(),
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
          model: model.campusModel.unscoped(),
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
    attributes: ["examScheduleId", "examDate", "examTime", "duration"],
    paranoid: true,
    raw: true,
  });
}

async function findOverlappingExamBusyRoomIds(examDate, excludeExamScheduleId, startMinutes, endMinutes) {
  const rows = await model.examScheduleRoomCapacityModel.findAll({
    attributes: ["classRoomSectionId"],
    include: [
      {
        model: model.examScheduleModel.unscoped(),
        as: "examSchedule",
        attributes: [],
        required: true,
        paranoid: true,
        where: {
          ...buildScope(model.examScheduleModel),
          examDate,
          examScheduleId: { [Op.ne]: excludeExamScheduleId },
          [Op.and]: [
            sequelize.where(
              sequelize.literal(
                "((TIME_TO_SEC(`examSchedule`.`exam_time`) / 60) + CAST(`examSchedule`.`duration` AS UNSIGNED))",
              ),
              { [Op.gt]: startMinutes },
            ),
            sequelize.where(sequelize.literal("(TIME_TO_SEC(`examSchedule`.`exam_time`) / 60)"), {
              [Op.lt]: endMinutes,
            }),
          ],
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
    raw: true,
  });

  return rows.map((row) => row.classRoomSectionId);
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

  return scoped(model.classRoomModel).findAll({
    where,
    attributes: [
      "classRoomSectionId",
      "roomNumber",
      "capacity",
      "examCapacity",
      "examCapacityColumns",
      [
        sequelize.literal("COALESCE(`class_room_section`.`exam_capacity`, `class_room_section`.`capacity`)"),
        "effectiveExamCapacity",
      ],
    ],
    paranoid: true,
    include: [activeRoomHierarchyInclude()],
    order: [["roomNumber", "ASC"]],
    raw: true,
  });
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
  const availableRooms = await findAvailableRoomsForExamSlot(busyRoomIds);

  return {
    examScheduleId: examSchedule.examScheduleId,
    examDate: examSchedule.examDate,
    examTime: examSchedule.examTime,
    duration: examSchedule.duration,
    slotStartTime: startTime,
    slotEndTime: endTime,
    day,
    availableRooms,
  };
}

async function findOccupiedRoomIdsByClassSchedule(day, startTime, endTime, examDate) {
  const schedules = await model.classScheduleModel.findAll({
    attributes: ["classRoomSectionId"],
    where: {
      classRoomSectionId: { [Op.not]: null },
      day,
    },
    group: ["classRoomSectionId"],
    paranoid: true,
    raw: true,
    include: [
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: [],
        required: true,
        paranoid: true,
        include: [activeRoomHierarchyInclude()],
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: "timeTablecreation",
        attributes: [],
        required: true,
        paranoid: true,
        where: {
          [Op.and]: [{ startTime: { [Op.lt]: endTime } }, { endTime: { [Op.gt]: startTime } }],
        },
      },
      {
        model: model.timeTableRoutineModel.unscoped(),
        as: "timeTablecreate",
        attributes: [],
        required: true,
        paranoid: true,
        where: {
          startingDate: { [Op.lte]: examDate },
          endingDate: { [Op.gte]: examDate },
          ...buildScope(model.timeTableRoutineModel),
        },
      },
    ],
  });

  return schedules.map((row) => row.classRoomSectionId);
}

export async function getRoomsForAllocationLookup(classRoomSectionIds) {
  const rooms = await scoped(model.classRoomModel).findAll({
    where: { classRoomSectionId: { [Op.in]: classRoomSectionIds } },
    attributes: ["classRoomSectionId", "roomNumber", "capacity", "examCapacity", "examCapacityColumns"],
    paranoid: true,
    include: [activeRoomHierarchyInclude()],
    raw: true,
  });

  const roomLookup = new Map();
  for (const room of rooms) {
    roomLookup.set(room.classRoomSectionId, room);
  }

  return roomLookup;
}
