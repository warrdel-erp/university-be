import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import { classSectionTermsInclude, studentClassSectionTermWithSectionInclude } from "../utility/classSectionIncludes.js";

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
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["academicYearId", "yearTitle"],
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
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["academicYearId", "yearTitle"],
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
            academicYearId: { [Op.in]: acedmicYears },
        };

        const counts = await scoped(model.studentModel).findAll({
            attributes: [
                [sequelize.col('studentClassSectionTerm->classSection.session_id'), 'sessionId'],
                [sequelize.col('studentClassSectionTerm.term'), 'term'],
                [sequelize.col('studentClassSectionTerm->classSection.course_id'), 'courseId'],
                [sequelize.col('studentClassSectionTerm->classSection.acedmic_year_id'), 'academicYearId'],
                [sequelize.fn('COUNT', sequelize.col('students.student_id')), 'studentCount'],
            ],
            include: [
                {
                    model: model.classSectionTermModel,
                    as: 'studentClassSectionTerm',
                    attributes: [],
                    required: true,
                    where: { term: { [Op.in]: terms } },
                    include: [{
                        model: model.classSectionModel,
                        as: 'classSection',
                        attributes: [],
                        required: true,
                        where: sectionWhere,
                    }],
                },
            ],
            group: [
                'studentClassSectionTerm->classSection.session_id',
                'studentClassSectionTerm.term',
                'studentClassSectionTerm->classSection.course_id',
                'studentClassSectionTerm->classSection.acedmic_year_id',
            ],
            raw: true,
        });
        return counts;
    } catch (error) {
        console.error("Error fetching student counts by groups:", error);
        throw error;
    }
}

function classTermInclude(term, academicYearId) {
    return studentClassSectionTermWithSectionInclude({
        term,
        termRequired: true,
        sectionRequired: true,
        includeSectionTerms: false,
        sectionAttributes: [],
        termAttributes: [],
        sectionWhere: {
            ...(academicYearId != null && { academicYearId }),
            ...buildScope(model.classSectionModel),
        },
    });
}

async function resolveStudentIdsByClassStudentMapper(sessionId, courseId, term, academicYearId) {
    const rows = await model.classStudentMapperModel.findAll({
        attributes: ["studentId"],
        where: {
            sessionId,
            academicYearId,
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

async function resolveStudentIdsByStudentTable(sessionId, courseId, term, academicYearId) {
    const rows = await scoped(model.studentModel).findAll({
        attributes: ["studentId"],
        where: { sessionId, courseId },
        include: [classTermInclude(term, academicYearId)],
        raw: true,
    });

    return rows.map((row) => row.studentId);
}

/** Enrolled students: class_student_mapper (primary) or students table, filtered by term via class section. */
async function resolveStudentIdsForExamGroup(sessionId, courseId, term, academicYearId) {
    const mapperIds = await resolveStudentIdsByClassStudentMapper(sessionId, courseId, term, academicYearId);
    if (mapperIds.length) {
        return mapperIds;
    }
    return resolveStudentIdsByStudentTable(sessionId, courseId, term, academicYearId);
}

export async function getStudentCountByGroup(sessionId, courseId, term, academicYearId) {
    try {
        const studentIds = await resolveStudentIdsForExamGroup(sessionId, courseId, term, academicYearId);
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

export async function getStudentsForSchedule(sessionId, courseId, term, academicYearId) {
    try {
        const studentIds = await resolveStudentIdsForExamGroup(sessionId, courseId, term, academicYearId);
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
