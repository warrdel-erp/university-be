import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { Op } from "sequelize";

// Exam overlap SQL: column refs only; startMinutes/endMinutes are bound via sequelize.where (not string-interpolated).
// TODO(schema): prefer exam_schedule.slot_start_minutes / slot_end_minutes or generated columns when migrating.
const EXAM_SCHEDULE_JOIN_ALIAS = "examSchedule";
const EXAM_SLOT_START_MINUTES_SQL = `(TIME_TO_SEC(\`${EXAM_SCHEDULE_JOIN_ALIAS}\`.\`exam_time\`) / 60)`;
const EXAM_SLOT_END_MINUTES_SQL = `(${EXAM_SLOT_START_MINUTES_SQL} + CAST(\`${EXAM_SCHEDULE_JOIN_ALIAS}\`.\`duration\` AS UNSIGNED))`;
const EFFECTIVE_EXAM_CAPACITY_SQL =
    "COALESCE(`class_room_section`.`exam_capacity`, `class_room_section`.`capacity`)";

function examSlotOverlapsMinutesWhere(startMinutes, endMinutes) {
    return {
        [Op.and]: [
            sequelize.where(sequelize.literal(EXAM_SLOT_END_MINUTES_SQL), { [Op.gt]: startMinutes }),
            sequelize.where(sequelize.literal(EXAM_SLOT_START_MINUTES_SQL), { [Op.lt]: endMinutes }),
        ],
    };
}

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

export async function getClassRoomsByUniversity(universityId) {
    return await model.classRoomModel.findAll({
        attributes: [
            "classRoomSectionId",
            "roomNumber",
            "capacity",
            "examCapacity",
            "examCapacityColumns",
        ],
        paranoid: true,
        include: [activeRoomHierarchyInclude(universityId)],
        order: [["roomNumber", "ASC"]],
        raw: true,
    });
}

export async function findOverlappingExamBusyRoomIds(
    examDate,
    excludeExamScheduleId,
    startMinutes,
    endMinutes
) {
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
                    ...examSlotOverlapsMinutesWhere(startMinutes, endMinutes),
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

export async function findAssignedRoomIdsForExam(examScheduleId) {
    const rows = await model.examScheduleRoomCapacityModel.findAll({
        attributes: ["classRoomSectionId"],
        where: { examScheduleId },
        raw: true,
    });

    return rows.map((row) => row.classRoomSectionId);
}

export async function collectBusyRoomIdsForExamSlot({
    examScheduleId,
    examDate,
    day,
    startTime,
    endTime,
    startMinutes,
    endMinutes,
}) {
    const busyRoomIds = new Set();

    const [classBusyRoomIds, assignedRoomIds, overlappingExamRoomIds] = await Promise.all([
        findOccupiedRoomIdsByClassSchedule(day, startTime, endTime, examDate),
        findAssignedRoomIdsForExam(examScheduleId),
        findOverlappingExamBusyRoomIds(examDate, examScheduleId, startMinutes, endMinutes),
    ]);

    for (const roomId of classBusyRoomIds) {
        busyRoomIds.add(roomId);
    }
    for (const roomId of assignedRoomIds) {
        busyRoomIds.add(roomId);
    }
    for (const roomId of overlappingExamRoomIds) {
        busyRoomIds.add(roomId);
    }

    const result = [];
    for (const roomId of busyRoomIds) {
        result.push(roomId);
    }
    return result;
}

export async function findAvailableRoomsForExamSlot(universityId, busyRoomIds) {
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
            [sequelize.literal(EFFECTIVE_EXAM_CAPACITY_SQL), "effectiveExamCapacity"],
        ],
        paranoid: true,
        include: [activeRoomHierarchyInclude(universityId)],
        order: [["roomNumber", "ASC"]],
        raw: true,
    });
}

export async function findOccupiedRoomIdsByClassSchedule(day, startTime, endTime, examDate) {
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
                    [Op.and]: [
                        { startTime: { [Op.lt]: endTime } },
                        { endTime: { [Op.gt]: startTime } },
                    ],
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

    const roomLookup = new Map();
    for (const room of rooms) {
        roomLookup.set(room.classRoomSectionId, room);
    }

    return roomLookup;
}
