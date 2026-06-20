import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";

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
        const { subjectId, semesterId, examSetupTypeTermId, courseId, term, sessionId } = filters;

        const result = await scoped(model.examScheduleModel).findAll({
            where: {
                ...(subjectId && { subjectId }),
                ...(semesterId && { semesterId }),
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
                            model: model.employeeModel,
                            as: "teacherEmployee",
                            attributes: ["employeeName", "employeeId"],
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                },
                {
                    model: model.semesterModel,
                    as: "semesterexam",
                    attributes: ["semesterId", "name"],
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"],
                },
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerm",
                    attributes: ["examSetupTypeTermId", "term", "courseId"],
                    where: {
                        ...buildScope(model.examSetupTypeTermModel),
                        ...(courseId && { courseId }),
                        ...(term && { term }),
                    },
                    required: !!(courseId || term),
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                            where: buildScope(model.examSetupTypeModel),
                        },
                    ],
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
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                },
                {
                    model: model.semesterModel,
                    as: "semesterexam",
                    attributes: ["semesterId", "name"],
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"],
                },
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerm",
                    attributes: ["examSetupTypeTermId", "term", "courseId"],
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                        },
                    ],
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
        console.error("Error fetching exam schedule by id:", error);
        throw error;
    }
}

export async function getStudentCountsByGroups(sessions, courses, terms, acedmicYears) {
    try {
        const sectionWhere = {
            ...buildScope(model.classSectionModel),
            sessionId: { [Op.in]: sessions },
            courseId: { [Op.in]: courses },
            acedmicYearId: { [Op.in]: acedmicYears },
        };

        const counts = await scoped(model.studentModel).findAll({
            attributes: [
                [sequelize.col('studentSections.session_id'), 'sessionId'],
                [sequelize.col('studentSections->classGroup.term'), 'term'],
                [sequelize.col('studentSections.course_id'), 'courseId'],
                [sequelize.col('studentSections.acedmic_year_id'), 'acedmicYearId'],
                [sequelize.fn('COUNT', sequelize.col('students.student_id')), 'studentCount'],
            ],
            include: [
                {
                    model: model.classSectionModel,
                    as: 'studentSections',
                    attributes: [],
                    required: true,
                    where: sectionWhere,
                    include: [
                        {
                            model: model.classModel,
                            as: 'classGroup',
                            attributes: [],
                            required: true,
                            where: {
                                term: { [Op.in]: terms },
                            },
                        },
                    ],
                },
            ],
            group: ['studentSections.session_id', 'studentSections->classGroup.term', 'studentSections.course_id', 'studentSections.acedmic_year_id'],
            raw: true,
        });
        return counts;
    } catch (error) {
        console.error("Error fetching student counts by groups:", error);
        throw error;
    }
}

function classTermInclude(term, acedmicYearId) {
    return {
        model: model.classSectionModel,
        as: "studentSections",
        required: true,
        attributes: [],
        where: {
            ...(acedmicYearId != null && { acedmicYearId }),
            ...buildScope(model.classSectionModel),
        },
        include: [
            {
                model: model.classModel,
                as: "classGroup",
                required: true,
                attributes: [],
                where: { term },
            },
        ],
    };
}

async function resolveStudentIdsByClassStudentMapper(sessionId, courseId, term, acedmicYearId) {
    const rows = await model.classStudentMapperModel.findAll({
        attributes: ["studentId"],
        where: {
            sessionId,
            acedmicYearId,
            isPassed: false,
            ...buildScope(model.classStudentMapperModel),
        },
        include: [
            {
                model: model.studentModel,
                as: "studentMapped",
                required: true,
                attributes: [],
                where: {
                    courseId,
                    ...buildScope(model.studentModel),
                },
                include: [classTermInclude(term)],
            },
        ],
        raw: true,
    });

    return [...new Set(rows.map((row) => row.studentId))];
}

async function resolveStudentIdsByStudentTable(sessionId, courseId, term, acedmicYearId) {
    const rows = await scoped(model.studentModel).findAll({
        attributes: ["studentId"],
        where: { sessionId, courseId },
        include: [classTermInclude(term, acedmicYearId)],
        raw: true,
    });

    return rows.map((row) => row.studentId);
}

/** Enrolled students: class_student_mapper (primary) or students table, filtered by term via class section. */
async function resolveStudentIdsForExamGroup(sessionId, courseId, term, acedmicYearId) {
    const mapperIds = await resolveStudentIdsByClassStudentMapper(sessionId, courseId, term, acedmicYearId);
    if (mapperIds.length) {
        return mapperIds;
    }
    return resolveStudentIdsByStudentTable(sessionId, courseId, term, acedmicYearId);
}

export async function getStudentCountByGroup(sessionId, courseId, term, acedmicYearId) {
    try {
        const studentIds = await resolveStudentIdsForExamGroup(sessionId, courseId, term, acedmicYearId);
        if (!studentIds.length) {
            return 0;
        }

        return scoped(model.studentModel).count({
            where: { studentId: { [Op.in]: studentIds } },
        });
    } catch (error) {
        console.error("Error fetching student count by group:", error);
        throw error;
    }
}

export async function getStudentsForSchedule(sessionId, courseId, term, acedmicYearId) {
    try {
        const studentIds = await resolveStudentIdsForExamGroup(sessionId, courseId, term, acedmicYearId);
        if (!studentIds.length) {
            return [];
        }

        return scoped(model.studentModel).findAll({
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
            where: { studentId: { [Op.in]: studentIds } },
            order: [["firstName", "ASC"]],
        });
    } catch (error) {
        console.error("Error fetching students for schedule:", error);
        throw error;
    }
}

export async function allocateSeats(allocations, transaction) {
    try {
        for (const allocation of allocations) {
            const capacity = await assertScopedRoomCapacity(allocation.examScheduleRoomCapacityId, transaction);
            if (!capacity) {
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
        for (const capacityId of examScheduleRoomCapacityIds) {
            const capacity = await assertScopedRoomCapacity(capacityId, transaction);
            if (!capacity) {
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
