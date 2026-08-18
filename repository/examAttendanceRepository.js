import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export { sequelize };

async function assertScopedExamSchedule(examScheduleId, transaction) {
    return scoped(model.examScheduleModel).findOne({
        where: { examScheduleId },
        attributes: ['examScheduleId'],
        transaction,
    });
}

export async function createExamAttendance(data) {
    if (data.examScheduleId) {
        const schedule = await assertScopedExamSchedule(data.examScheduleId);
        if (!schedule) {
            throw new Error('Exam schedule not found');
        }
    }
    return await scoped(model.examAttendanceModel).create(data);
}

export async function getAllExamAttendance(academicYearId) {
    return await scoped(model.examAttendanceModel).findAll({
        attributes: {
            exclude: ["createdAt", "updatedAt", "updatedBy", "createdBy"],
        },
        include: [
            {
                model: model.studentModel,
                as: "student",
                attributes: ["student_id", "first_name", "last_name", "scholar_number"],
                where: buildScope(model.studentModel),
                required: false,
            },
            {
                model: model.examScheduleModel,
                as: "examSchedule",
                attributes: ["examScheduleId", "examDate", "term"],
                required: true,
            },
            {
                model: model.examScheduleRoomCapacityModel,
                as: "examScheduleRoomCapacity",
                attributes: ["examScheduleRoomCapacityId", "classRoomSectionId", "capacity"],
                required: false,
            },
            {
                model: model.studentExamSeatModel,
                as: "studentExamSeat",
                attributes: ["studentExamSeatId", "row", "column"],
                required: false,
            },
            {
                model: model.userModel,
                as: 'markerUser',
                attributes: ["universityId", "userId", "userName"],
            },
        ],
    });
}

export async function getSingleExamAttendance(examAttendanceId) {
    const record = await scoped(model.examAttendanceModel).findOne({
        attributes: {
            exclude: ["createdAt", "updatedAt", "updatedBy", "createdBy"],
        },
        where: { examAttendanceId },
        include: [
            {
                model: model.studentModel,
                as: "student",
                attributes: ["student_id", "first_name", "last_name", "scholar_number"],
                where: buildScope(model.studentModel),
                required: false,
            },
            {
                model: model.examScheduleModel,
                as: "examSchedule",
                attributes: ["examScheduleId", "examDate", "term"],
                required: true,
            },
            {
                model: model.examScheduleRoomCapacityModel,
                as: "examScheduleRoomCapacity",
                attributes: ["examScheduleRoomCapacityId", "classRoomSectionId", "capacity"],
                required: false,
            },
            {
                model: model.studentExamSeatModel,
                as: "studentExamSeat",
                attributes: ["studentExamSeatId", "row", "column"],
                required: false,
            },
            {
                model: model.userModel,
                as: 'markerUser',
                attributes: ["universityId", "userId", "userName"],
            },
        ],
    });
    return record;
}

export async function updateExamAttendances(attendances) {
    const updatedRecords = [];
    for (const record of attendances) {
        const { examAttendanceId, ...data } = record;
        const existing = await scoped(model.examAttendanceModel).findOne({
            where: { examAttendanceId },
            attributes: ['examAttendanceId'],
        });
        if (!existing) {
            continue;
        }
        const [updatedRows] = await scoped(model.examAttendanceModel).update(data, {
            where: { examAttendanceId },
        });
        if (updatedRows > 0) {
            const updatedRecord = await scoped(model.examAttendanceModel).findByPk(examAttendanceId);
            updatedRecords.push(updatedRecord);
        }
    }
    return updatedRecords;
}

export async function deleteExamAttendance(examAttendanceId) {
    const existing = await scoped(model.examAttendanceModel).findOne({
        where: { examAttendanceId },
        attributes: ['examAttendanceId'],
    });
    if (!existing) {
        return false;
    }
    const deletedRows = await scoped(model.examAttendanceModel).destroy({
        where: { examAttendanceId },
    });
    return deletedRows > 0;
}

export async function findAndCountSchedules(where, subjectWhere, limit, offset) {
    return scoped(model.examScheduleModel).findAndCountAll({
        where,
        attributes: ["examScheduleId", "examDate", "term", "sessionId", "examinationSessionId", "examinationSessionSlotId"],
        include: [
            {
                model: model.subjectModel,
                as: "subjectSchedule",
                attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
                where: Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
                required: Object.keys(subjectWhere).length > 0 || where[Op.or] ? true : false,
            },
            {
                model: model.examScheduleRoomCapacityModel,
                as: "roomCapacities",
                attributes: ["examScheduleRoomCapacityId", "classRoomSectionId", "capacity"],
                include: [
                    {
                        model: model.classRoomModel,
                        as: "classRoom",
                        attributes: ["classRoomSectionId", "roomNumber"],
                    },
                    {
                        model: model.studentExamSeatModel,
                        as: "seats",
                        attributes: ["studentExamSeatId", "row", "column"],
                        include: [
                            {
                                model: model.studentModel,
                                as: "student",
                                attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
                            }
                        ]
                    }
                ]
            }
        ],
        distinct: true,
        limit,
        offset,
        order: [["examDate", "ASC"]]
    });
}

export async function getScheduleDetails(examScheduleId) {
    return scoped(model.examScheduleModel).findOne({
        where: { examScheduleId },
        include: [
            {
                model: model.subjectModel,
                as: "subjectSchedule",
                attributes: ["subjectName", "subjectCode"]
            },
            {
                model: model.examinationSessionSlotModel,
                as: "examinationSessionSlot",
                attributes: ["startTime", "endTime"]
            }
        ]
    });
}

export async function getRoomCapacityDetails(examScheduleRoomCapacityId) {
    return scoped(model.examScheduleRoomCapacityModel).findOne({
        where: { examScheduleRoomCapacityId },
        include: [
            {
                model: model.classRoomModel,
                as: "classRoom",
                attributes: ["classRoomSectionId", "roomNumber"]
            }
        ]
    });
}

export async function getRoomCapacityById(examScheduleRoomCapacityId) {
    return scoped(model.examScheduleRoomCapacityModel).findOne({
        where: { examScheduleRoomCapacityId }
    });
}

export async function updateRoomCapacityStatus(examScheduleRoomCapacityId, status, transaction = null) {
    const options = transaction ? { transaction } : {};
    return scoped(model.examScheduleRoomCapacityModel).update(
        { status },
        {
            where: { examScheduleRoomCapacityId },
            ...options
        }
    );
}

export async function getInvigilators(examinationSessionSlotId, examDate, classRoomSectionId) {
    return scoped(model.examInvigilatorAssignmentModel).findAll({
        where: {
            examinationSessionSlotId,
            examDate,
            classRoomSectionId,
            role: "INVIGILATOR"
        },
        include: [
            {
                model: model.userModel,
                as: "user",
                attributes: ["userId", "userName"]
            }
        ]
    });
}

export async function getStudentSeats(examScheduleRoomCapacityId) {
    return scoped(model.studentExamSeatModel).findAll({
        where: { examScheduleRoomCapacityId },
        include: [
            {
                model: model.studentModel,
                as: "student",
                attributes: ["studentId", "firstName", "lastName", "scholarNumber", "enrollNumber"]
            }
        ]
    });
}

export async function getAttendances(examScheduleId, examScheduleRoomCapacityId) {
    return scoped(model.examAttendanceModel).findAll({
        where: {
            examScheduleId,
            examScheduleRoomCapacityId
        }
    });
}

export async function findAttendance(examScheduleId, examScheduleRoomCapacityId, studentId, transaction) {
    return scoped(model.examAttendanceModel).findOne({
        where: {
            examScheduleId,
            examScheduleRoomCapacityId,
            studentId
        },
        transaction
    });
}

export async function updateAttendance(attendanceRecord, updateData, transaction) {
    return attendanceRecord.update(updateData, { transaction });
}

export async function createAttendance(attendanceData, transaction) {
    return scoped(model.examAttendanceModel).create(attendanceData, { transaction });
}

export async function getExamScheduleById(examScheduleId) {
    return scoped(model.examScheduleModel).findOne({
        where: { examScheduleId },
        include: [
            {
                model: model.subjectModel,
                as: "subjectSchedule",
                attributes: ["subjectId", "subjectName", "subjectCode"]
            },
            {
                model: model.examinationSessionSlotModel,
                as: "examinationSessionSlot",
                attributes: ["startTime", "endTime"]
            }
        ]
    });
}

export async function getRoomCapacitiesByExamScheduleId(examScheduleId) {
    return scoped(model.examScheduleRoomCapacityModel).findAll({
        where: { examScheduleId },
        include: [
            {
                model: model.classRoomModel,
                as: "classRoom",
                attributes: ["classRoomSectionId", "roomNumber"]
            }
        ]
    });
}

export async function getStudentCountsByRoomCapacityIds(ids) {
    if (!ids || ids.length === 0) return [];
    return model.studentExamSeatModel.findAll({
        where: {
            examScheduleRoomCapacityId: { [Op.in]: ids }
        },
        attributes: [
            "examScheduleRoomCapacityId",
            [sequelize.fn("COUNT", sequelize.col("student_id")), "studentCount"]
        ],
        group: ["examScheduleRoomCapacityId"],
        raw: true
    });
}

export async function getAttendanceStatusByExamSchedule(examScheduleId, roomCapacityIds) {
    if (!roomCapacityIds || roomCapacityIds.length === 0) return [];
    return scoped(model.examScheduleRoomCapacityModel).findAll({
        where: {
            examScheduleId,
            examScheduleRoomCapacityId: { [Op.in]: roomCapacityIds }
        },
        attributes: ["examScheduleRoomCapacityId", "status"]
    });
}

export async function getInvigilatorsByRooms({ examDate, examinationSessionSlotId, classRoomSectionIds }) {
    if (!classRoomSectionIds || classRoomSectionIds.length === 0) return [];
    return scoped(model.examInvigilatorAssignmentModel).findAll({
        where: {
            examDate,
            examinationSessionSlotId,
            classRoomSectionId: { [Op.in]: classRoomSectionIds },
            role: "INVIGILATOR"
        },
        include: [
            {
                model: model.userModel,
                as: "user",
                attributes: ["userId", "userName"]
            }
        ]
    });
}
