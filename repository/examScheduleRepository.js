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
            model: model.examScheduleModel.unscoped(),
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
                    model: model.examScheduleRoomCapacityModel.unscoped(),
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel.unscoped(),
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"],
                        },
                    ],
                },
                {
                    model: model.teacherExamAssignmentModel.unscoped(),
                    as: "teacherAssignments",
                    include: [
                        {
                            model: model.employeeModel.unscoped(),
                            as: "teacherEmployee",
                            attributes: ["employeeName", "employeeId"],
                        },
                    ],
                },
                {
                    model: model.subjectModel.unscoped(),
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                },
                {
                    model: model.semesterModel.unscoped(),
                    as: "semesterexam",
                    attributes: ["semesterId", "name"],
                },
                {
                    model: model.acedmicYearModel.unscoped(),
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"],
                },
                {
                    model: model.examSetupTypeTermModel.unscoped(),
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
                            model: model.examSetupTypeModel.unscoped(),
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                            where: buildScope(model.examSetupTypeModel),
                        },
                    ],
                },
                {
                    model: model.sessionModel.unscoped(),
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
                    model: model.examScheduleRoomCapacityModel.unscoped(),
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel.unscoped(),
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"],
                        },
                        {
                            model: model.studentExamSeatModel.unscoped(),
                            as: "seats",
                            attributes: ["studentExamSeatId", "row", "column"],
                            include: [
                                {
                                    model: model.studentModel.unscoped(),
                                    as: "student",
                                    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.subjectModel.unscoped(),
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                },
                {
                    model: model.semesterModel.unscoped(),
                    as: "semesterexam",
                    attributes: ["semesterId", "name"],
                },
                {
                    model: model.acedmicYearModel.unscoped(),
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"],
                },
                {
                    model: model.examSetupTypeTermModel.unscoped(),
                    as: "examSetupTypeTerm",
                    attributes: ["examSetupTypeTermId", "term", "courseId"],
                    include: [
                        {
                            model: model.examSetupTypeModel.unscoped(),
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                        },
                    ],
                },
                {
                    model: model.sessionModel.unscoped(),
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
                    model: model.classSectionModel.unscoped(),
                    as: 'studentSections',
                    attributes: [],
                    required: true,
                    where: sectionWhere,
                    include: [
                        {
                            model: model.classModel.unscoped(),
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

export async function getStudentCountByGroup(sessionId, courseId, term, acedmicYearId) {
    try {
        const count = await scoped(model.studentModel).count({
            include: [
                {
                    model: model.classSectionModel.unscoped(),
                    as: 'studentSections',
                    required: true,
                    where: {
                        ...buildScope(model.classSectionModel),
                        sessionId,
                        courseId,
                        acedmicYearId,
                    },
                    include: [
                        {
                            model: model.classModel.unscoped(),
                            as: 'classGroup',
                            required: true,
                            where: { term },
                        },
                    ],
                },
            ],
        });
        return count;
    } catch (error) {
        console.error("Error fetching student count by group:", error);
        throw error;
    }
}

export async function getStudentsForSchedule(sessionId, courseId, term, acedmicYearId) {
    try {
        const result = await scoped(model.studentModel).findAll({
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
            include: [
                {
                    model: model.classSectionModel.unscoped(),
                    as: 'studentSections',
                    required: true,
                    where: {
                        ...buildScope(model.classSectionModel),
                        sessionId,
                        courseId,
                        acedmicYearId,
                    },
                    include: [
                        {
                            model: model.classModel.unscoped(),
                            as: 'classGroup',
                            required: true,
                            where: { term },
                        },
                    ],
                },
            ],
            order: [['firstName', 'ASC']],
        });
        return result;
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
