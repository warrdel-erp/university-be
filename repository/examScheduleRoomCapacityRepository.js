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
                as: 'examSchedule',
                attributes: ['examScheduleId']
            }
        ]
    });
}

export async function getExamScheduleSlot(examScheduleId) {
    return await model.examScheduleModel.findByPk(examScheduleId, {
        attributes: ["examScheduleId", "examDate", "examTime", "duration"],
        paranoid: true,
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
    });
}

export async function findExamRoomAssignmentsOnDate(examDate, excludeExamScheduleId) {
    const rows = await model.examScheduleRoomCapacityModel.findAll({
        attributes: ["classRoomSectionId"],
        include: [
            {
                model: model.examScheduleModel,
                as: "examSchedule",
                attributes: ["examTime", "duration"],
                where: {
                    examDate,
                    examScheduleId: { [Op.ne]: excludeExamScheduleId },
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
        nest: true,
    });

    return rows.map((row) => ({
        classRoomSectionId: row.classRoomSectionId,
        examTime: row.examSchedule.examTime,
        duration: row.examSchedule.duration,
    }));
}

export async function findAssignedRoomIdsForExam(examScheduleId) {
    const rows = await model.examScheduleRoomCapacityModel.findAll({
        attributes: ["classRoomSectionId"],
        where: { examScheduleId },
        raw: true,
    });
    return rows.map((row) => row.classRoomSectionId);
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
            "examCapacityColumns"
        ],
        paranoid: true,
        include: [activeRoomHierarchyInclude()],
    });

    const roomLookup = new Map();
    for (const room of rooms) {
        roomLookup.set(room.classRoomSectionId, room.get({ plain: true }));
    }

    return roomLookup;
}
