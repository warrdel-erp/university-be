import { Op, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { getSeatCountsByCapacityIds } from "../utility/roomCapacity.js";

function examScheduleInclude(scheduleWhere, subjectWhere) {
  return {
    model: model.examScheduleModel,
    as: "examSchedule",
    attributes: [],
    required: true,
    where: {
      ...scheduleWhere,
      ...buildScope(model.examScheduleModel),
    },
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: [],
        required: true,
        where: {
          ...subjectWhere,
          ...buildScope(model.subjectModel),
        },
      },
    ],
  };
}

/** Distinct physical rooms matching schedule/subject filters. */
export async function countDistinctRooms(scheduleWhere, subjectWhere) {
  return scoped(model.examScheduleRoomCapacityModel).count({
    distinct: true,
    col: "class_room_section_id",
    include: [examScheduleInclude(scheduleWhere, subjectWhere)],
  });
}

/**
 * Distinct rooms ordered by roomNumber.
 * Optional limit/offset for room-wise pagination.
 */
export async function findPaginatedRooms(
  scheduleWhere,
  subjectWhere,
  { limit, offset } = {},
) {
  const options = {
    attributes: [
      "classRoomSectionId",
      [col("classRoom.room_number"), "roomNumber"],
      [col("classRoom.capacity"), "roomCapacity"],
      [col("classRoom.exam_capacity"), "examCapacity"],
    ],
    include: [
      {
        model: model.classRoomModel,
        as: "classRoom",
        attributes: [],
        required: true,
        where: buildScope(model.classRoomModel),
      },
      examScheduleInclude(scheduleWhere, subjectWhere),
    ],
    group: [
      "exam_schedule_room_capacity.class_room_section_id",
      "classRoom.room_number",
      "classRoom.capacity",
      "classRoom.exam_capacity",
    ],
    order: [[col("classRoom.room_number"), "ASC"]],
    subQuery: false,
    raw: true,
  };

  if (limit != null) {
    options.limit = limit;
    options.offset = offset;
  }

  return scoped(model.examScheduleRoomCapacityModel).findAll(options);
}

/** Room-capacity rows for given rooms with schedule/subject/slot details. */
export async function findRoomCapacitiesForRooms(
  scheduleWhere,
  subjectWhere,
  classRoomSectionIds,
) {
  if (!classRoomSectionIds.length) return [];

  return scoped(model.examScheduleRoomCapacityModel).findAll({
    where: {
      classRoomSectionId: { [Op.in]: classRoomSectionIds },
    },
    attributes: [
      "examScheduleRoomCapacityId",
      "classRoomSectionId",
      "examScheduleId",
      "capacity",
    ],
    include: [
      {
        model: model.classRoomModel,
        as: "classRoom",
        required: true,
        attributes: [
          "classRoomSectionId",
          "roomNumber",
          "capacity",
          "examCapacity",
        ],
        where: buildScope(model.classRoomModel),
      },
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        attributes: [
          "examScheduleId",
          "examDate",
          "term",
          "sessionId",
          "examinationSessionSlotId",
          "subjectId",
        ],
        where: {
          ...scheduleWhere,
          ...buildScope(model.examScheduleModel),
        },
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            required: true,
            attributes: [
              "subjectId",
              "subjectName",
              "subjectCode",
              "courseId",
            ],
            where: {
              ...subjectWhere,
              ...buildScope(model.subjectModel),
            },
          },
          {
            model: model.examinationSessionSlotModel,
            as: "examinationSessionSlot",
            required: true,
            attributes: [
              "examinationSessionSlotId",
              "slotNumber",
              "startTime",
              "endTime",
            ],
            where: buildScope(model.examinationSessionSlotModel),
          },
        ],
      },
    ],
    order: [
      [{ model: model.classRoomModel, as: "classRoom" }, "roomNumber", "ASC"],
      [
        { model: model.examScheduleModel, as: "examSchedule" },
        "examDate",
        "ASC",
      ],
      [
        { model: model.examScheduleModel, as: "examSchedule" },
        {
          model: model.examinationSessionSlotModel,
          as: "examinationSessionSlot",
        },
        "startTime",
        "ASC",
      ],
    ],
  });
}

export async function findInvigilatorsForRooms(
  classRoomSectionIds,
  examDates,
  slotIds,
) {
  if (!classRoomSectionIds.length || !examDates.length || !slotIds.length) {
    return [];
  }

  return scoped(model.examInvigilatorAssignmentModel).findAll({
    where: {
      classRoomSectionId: { [Op.in]: classRoomSectionIds },
      examDate: { [Op.in]: examDates },
      examinationSessionSlotId: { [Op.in]: slotIds },
      ...buildScope(model.examInvigilatorAssignmentModel),
    },
    attributes: [
      "examInvigilatorAssignmentId",
      "classRoomSectionId",
      "examDate",
      "examinationSessionSlotId",
      "userId",
      "role",
    ],
    include: [
      {
        model: model.users,
        as: "user",
        attributes: ["userId", "userName"],
        required: true,
      },
    ],
  });
}

export async function findMaterialBundlesForRooms(
  classRoomSectionIds,
  examDates,
  slotIds,
) {
  if (!classRoomSectionIds.length || !examDates.length || !slotIds.length) {
    return [];
  }

  return scoped(model.examRoomMaterialBundleModel).findAll({
    where: {
      classRoomSectionId: { [Op.in]: classRoomSectionIds },
      examDate: { [Op.in]: examDates },
      examinationSessionSlotId: { [Op.in]: slotIds },
      ...buildScope(model.examRoomMaterialBundleModel),
    },
    attributes: [
      "examRoomMaterialBundleId",
      "bundleCode",
      "status",
      "examDate",
      "examinationSessionSlotId",
      "classRoomSectionId",
      "issuedTo",
      "issuedBy",
      "issuedAt",
      "receivedBy",
      "receivedAt",
      "verifiedBy",
      "verifiedAt",
      "remarks",
    ],
    include: [
      {
        model: model.examRoomMaterialItemModel,
        as: "items",
        required: false,
        attributes: [
          "examRoomMaterialItemId",
          "itemType",
          "plannedQuantity",
          "issuedQuantity",
          "usedQuantity",
          "unusedQuantity",
          "returnedQuantity",
          "damagedQuantity",
          "remarks",
        ],
      },
      {
        model: model.users,
        as: "recipientUser",
        required: false,
        attributes: ["userId", "userName"],
      },
      {
        model: model.users,
        as: "issuerUser",
        required: false,
        attributes: ["userId", "userName"],
      },
    ],
  });
}

export async function findSeatCountsByCapacityIds(capacityIds) {
  return getSeatCountsByCapacityIds(capacityIds);
}
