import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import {
    countStudentsForExamGroup,
    findStudentsForExamGroup,
    getStudentCountMapByGroups,
} from "../utility/studentCount.js";

async function assertScopedRoomCapacity(examScheduleRoomCapacityId, transaction) {
    return model.examScheduleRoomCapacityModel.findOne({
        where: { examScheduleRoomCapacityId },
        attributes: ['examScheduleRoomCapacityId'],
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

export async function getExamSchedules(filters = {}) {
    try {
        const { subjectId, examSetupTypeTermId, courseId, term, sessionId } = filters;

        const result = await scoped(model.examScheduleModel).findAll({
            where: {
                ...(subjectId && { subjectId }),
                ...(term && { term: Number(term) }),
                ...(examSetupTypeTermId && { examSetupTypeTermId }),
                ...(sessionId && { sessionId }),
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.examScheduleRoomCapacityModel,
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel,
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"],
                        },
                    ],
                },
                {
                    model: model.teacherExamAssignmentModel,
                    as: "teacherAssignments",
                    include: [
                        {
                            model: model.employeeModel, as: "teacherEmployee",
                            attributes: ["employeeName", "employeeId", "userId"],
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
                    where: {
                        ...(courseId && { courseId: Number(courseId) }),
                    },
                    required: !!courseId,
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["academicYearId", "yearTitle"],
                },
                {
                    model: model.examinationSessionModel,
                    as: "examinationSession",
                    attributes: ["examinationSessionId", "assessmentTypeId"],
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "assessmentType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                        }
                    ]
                },
                {
                    model: model.sessionModel,
                    as: "sessionSchedule",
                    attributes: ["sessionId", "sessionName"],
                },
            ],
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam schedules:", error);
        throw error;
    }
}

export async function getExamScheduleExists(examScheduleId) {
    return await scoped(model.examScheduleModel).findByPk(examScheduleId, {
        attributes: ["examScheduleId"],
    });
}

export async function getExamScheduleById(examScheduleId) {
    try {
        const result = await scoped(model.examScheduleModel).findByPk(examScheduleId, {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.examScheduleRoomCapacityModel,
                    as: "roomCapacities",
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
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["academicYearId", "yearTitle"],
                },
                {
                    model: model.sessionModel,
                    as: "sessionSchedule",
                    attributes: ["sessionId", "sessionName"],
                }
            ],
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam schedule by id:", error);
        throw error;
    }
}

export async function getStudentCountsByGroups(sessions, courses, terms, acedmicYears) {
    try {
        const groups = [];
        for (const sessionId of sessions) {
            for (const courseId of courses) {
                for (const term of terms) {
                    for (const academicYearId of acedmicYears) {
                        groups.push({ sessionId, courseId, term, academicYearId });
                    }
                }
            }
        }

        const countMap = await getStudentCountMapByGroups(groups);
        const counts = [];
        for (const [key, studentCount] of countMap) {
            const [sessionId, courseId, term, academicYearId] = key.split("_");
            counts.push({
                sessionId: Number(sessionId),
                courseId: Number(courseId),
                term: Number(term),
                academicYearId: Number(academicYearId),
                studentCount,
            });
        }
        return counts;
    } catch (error) {
        console.error("Error fetching student counts by groups:", error);
        throw error;
    }
}

export async function getStudentCountByGroup(sessionId, courseId, term, academicYearId) {
    try {
        return countStudentsForExamGroup(sessionId, courseId, term, academicYearId);
    } catch (error) {
        console.error("Error fetching student count by group:", error);
        throw error;
    }
}

export async function getStudentsForSchedule(sessionId, courseId, term, academicYearId) {
    try {
        return findStudentsForExamGroup(sessionId, courseId, term, academicYearId);
    } catch (error) {
        console.error("Error fetching students for schedule:", error);
        throw error;
    }
}

export async function getStudentsForSchedulePaginated(
    sessionId,
    courseId,
    term,
    academicYearId,
    { page = 1, limit = 10, search } = {},
) {
    const { rows, totalCount } = await findStudentsForExamGroup(
        sessionId,
        courseId,
        term,
        academicYearId,
        { page, limit, search },
    );
    return {
        result: rows,
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)) || 0,
    };
}

export async function allocateSeats(allocations, transaction) {
    try {
        const capacityIds = [...new Set(allocations.map(a => a.examScheduleRoomCapacityId))];
        if (capacityIds.length > 0) {
            const count = await model.examScheduleRoomCapacityModel.count({
                where: {
                    examScheduleRoomCapacityId: { [Op.in]: capacityIds },
                    ...buildScope(model.examScheduleRoomCapacityModel)
                },
                include: [{
                    model: model.examScheduleModel,
                    as: 'examSchedule',
                    required: true,
                    where: buildScope(model.examScheduleModel)
                }],
                transaction
            });
            if (count !== capacityIds.length) {
                throw new Error('Exam schedule room capacity not found');
            }
        }
        return await model.studentExamSeatModel.bulkCreate(allocations, { transaction });
    } catch (error) {
        console.error("Error allocating seats:", error);
        throw error;
    }
}

export async function clearExistingAllocations(examScheduleRoomCapacityIds, transaction) {
    try {
        if (examScheduleRoomCapacityIds.length > 0) {
            const count = await model.examScheduleRoomCapacityModel.count({
                where: {
                    examScheduleRoomCapacityId: { [Op.in]: examScheduleRoomCapacityIds },
                    ...buildScope(model.examScheduleRoomCapacityModel)
                },
                include: [{
                    model: model.examScheduleModel,
                    as: 'examSchedule',
                    required: true,
                    where: buildScope(model.examScheduleModel)
                }],
                transaction
            });
            if (count !== examScheduleRoomCapacityIds.length) {
                throw new Error('Exam schedule room capacity not found');
            }
        }
        return await model.studentExamSeatModel.destroy({
            where: {
                examScheduleRoomCapacityId: { [Op.in]: examScheduleRoomCapacityIds },
            },
            transaction,
        });
    } catch (error) {
        console.error("Error clearing existing allocations:", error);
        throw error;
    }
}

export async function getExamScheduleIdBySubject(subjectId, sessionId) {
    const schedule = await scoped(model.examScheduleModel).findOne({
        where: {
            subjectId,
            ...(sessionId && { sessionId }),
        },
        attributes: ["examScheduleId"],
        raw: true,
    });
    return schedule?.examScheduleId || null;
}

export async function getStudentSeatAllocationsBySchedule(examScheduleId) {
    return await model.studentExamSeatModel.findAll({
        include: [
            {
                model: model.examScheduleRoomCapacityModel,
                as: "roomCapacity",
                where: { examScheduleId },
                include: [
                    {
                        model: model.classRoomModel,
                        as: "classRoom",
                        attributes: ["roomNumber"],
                    }
                ]
            }
        ]
    });
}
