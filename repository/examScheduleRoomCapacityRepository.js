import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { Op } from "sequelize";

const activeRoomHierarchyInclude = (universityId) => ({
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
          ...(universityId && { where: { universityId } }),
        },
      ],
    },
  ],
});

export async function addExamRoomCapacity(data, transaction) {
  return await model.examScheduleRoomCapacityModel.create(data, { transaction });
}

export async function bulkAddExamRoomCapacity(data, transaction) {
  return await model.examScheduleRoomCapacityModel.bulkCreate(data, { transaction });
}

export async function updateExamRoomCapacity(examScheduleRoomCapacityId, data, transaction) {
  await model.examScheduleRoomCapacityModel.update(data, {
    where: { examScheduleRoomCapacityId },
    transaction,
  });
  return true;
}

export async function deleteExamRoomCapacity(examScheduleRoomCapacityId, transaction) {
  return await model.examScheduleRoomCapacityModel.destroy({
    where: { examScheduleRoomCapacityId },
    transaction,
  });
}

export async function getExamRoomCapacityById(examScheduleRoomCapacityId) {
  return await model.examScheduleRoomCapacityModel.findByPk(examScheduleRoomCapacityId, {
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examScheduleId"],
      },
    ],
    raw: true,
    nest: true,
  });
}

export async function getExamScheduleSlot(examScheduleId) {
  return await model.examScheduleModel.findByPk(examScheduleId, {
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
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: [],
        where: {
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
        required: true,
        paranoid: true,
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

async function findAvailableRoomsForExamSlot(universityId, busyRoomIds) {
  const where = {};
  if (busyRoomIds.length) {
    where.classRoomSectionId = { [Op.notIn]: busyRoomIds };
  }

  return model.classRoomModel.findAll({
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
    include: [activeRoomHierarchyInclude(universityId)],
    order: [["roomNumber", "ASC"]],
    raw: true,
  });
}

export async function getAvailableRoomsPayload(examScheduleId, universityId, examSchedule, slot) {
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
  const availableRooms = await findAvailableRoomsForExamSlot(universityId, busyRoomIds);

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
        model: model.timeTableRoutineModel,
        as: "timeTablecreate",
        attributes: [],
        required: true,
        paranoid: true,
        where: {
          startingDate: { [Op.lte]: examDate },
          endingDate: { [Op.gte]: examDate },
        },
      },
    ],
  });

  return schedules.map((row) => row.classRoomSectionId);
}

export async function getRoomsForAllocationLookup(classRoomSectionIds) {
  const rooms = await model.classRoomModel.findAll({
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
