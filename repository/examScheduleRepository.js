import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { Op } from "sequelize";

export async function getExamSchedules(universityId, acedmicYearId, instituteId, filters = {}) {
    try {
        const { subjectId, semesterId, examSetupTypeTermId, courseId, term, sessionId } = filters;

        const result = await model.examScheduleModel.findAll({
            where: {
                ...(acedmicYearId && { acedmicYearId }),
                ...(subjectId && { subjectId }),
                ...(semesterId && { semesterId }),
                ...(examSetupTypeTermId && { examSetupTypeTermId }),
                ...(sessionId && { sessionId })
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
                            attributes: ["classRoomSectionId", "roomNumber"]
                        }
                    ]
                },
                {
                    model: model.teacherExamAssignmentModel,
                    as: "teacherAssignments",
                    include: [
                        {
                            model: model.employeeModel,
                            as: "teacherEmployee",
                            attributes: ["employeeName", "employeeId"]
                        }
                    ]
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode"]
                },
                {
                    model: model.semesterModel,
                    as: "semesterexam",
                    attributes: ["semesterId", "name"]
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"]
                },
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerm",
                    attributes: ["examSetupTypeTermId", "term", "courseId"],
                    where: {
                        ...(courseId && { courseId }),
                        ...(term && { term })
                    },
                    required: (courseId || term) ? true : false,
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                            where: {
                                ...(universityId && { universityId }),
                                ...(instituteId && { instituteId })
                            },
                        }
                    ]
                },
                {
                    model: model.sessionModel,
                    as: "sessionSchedule",
                    attributes: ["sessionId", "sessionName"]
                }
            ]
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam schedules:", error);
        throw error;
    }
}

export async function getExamScheduleById(examScheduleId) {
    try {
        const result = await model.examScheduleModel.findByPk(examScheduleId, {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.examScheduleRoomCapacityModel,
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel,
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"]
                        },
                        {
                            model: model.studentExamSeatModel,
                            as: "seats",
                            attributes: ["studentExamSeatId", "row", "column"],
                            include: [
                                {
                                    model: model.studentModel,
                                    as: "student",
                                    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"]
                                }
                            ]
                        }
                    ]
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode"]
                },
                {
                    model: model.semesterModel,
                    as: "semesterexam",
                    attributes: ["semesterId", "name"]
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                    attributes: ["acedmicYearId", "yearTitle"]
                },
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerm",
                    attributes: ["examSetupTypeTermId", "term", "courseId"],
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "examSetupType",
                            attributes: ["examSetupTypeId", "examType", "examName"]
                        }
                    ]
                },
                {
                    model: model.sessionModel,
                    as: "sessionSchedule",
                    attributes: ["sessionId", "sessionName"]
                }
            ]
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam schedule by id:", error);
        throw error;
    }
}

export async function getStudentCountsByGroups(sessions, courses, terms, acedmicYears) {
    try {
        const counts = await model.studentModel.findAll({
            attributes: [
                [sequelize.col('studentSections.session_id'), 'sessionId'],
                [sequelize.col('studentSections->classGroup.term'), 'term'],
                [sequelize.col('studentSections.course_id'), 'courseId'],
                [sequelize.col('studentSections.acedmic_year_id'), 'acedmicYearId'],
                [sequelize.fn('COUNT', sequelize.col('students.student_id')), 'studentCount']
            ],
            include: [
                {
                    model: model.classSectionModel,
                    as: 'studentSections',
                    attributes: [],
                    required: true,
                    where: {
                        sessionId: { [Op.in]: sessions },
                        courseId: { [Op.in]: courses },
                        acedmicYearId: { [Op.in]: acedmicYears }
                    },
                    include: [
                        {
                            model: model.classModel,
                            as: 'classGroup',
                            attributes: [],
                            required: true,
                            where: {
                                term: { [Op.in]: terms }
                            }
                        }
                    ]
                }
            ],
            group: ['studentSections.session_id', 'studentSections->classGroup.term', 'studentSections.course_id', 'studentSections.acedmic_year_id'],
            raw: true
        });
        return counts;
    } catch (error) {
        console.error("Error fetching student counts by groups:", error);
        throw error;
    }
}

export async function getStudentCountByGroup(sessionId, courseId, term, acedmicYearId) {
    try {
        const count = await model.studentModel.count({
            include: [
                {
                    model: model.classSectionModel,
                    as: 'studentSections',
                    required: true,
                    where: {
                        sessionId,
                        courseId,
                        acedmicYearId
                    },
                    include: [
                        {
                            model: model.classModel,
                            as: 'classGroup',
                            required: true,
                            where: {
                                term
                            }
                        }
                    ]
                }
            ]
        });
        return count;
    } catch (error) {
        console.error("Error fetching student count by group:", error);
        throw error;
    }
}

export async function getStudentsForSchedule(sessionId, courseId, term, acedmicYearId) {
    try {
        const result = await model.studentModel.findAll({
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
            include: [
                {
                    model: model.classSectionModel,
                    as: 'studentSections',
                    required: true,
                    where: {
                        sessionId,
                        courseId,
                        acedmicYearId
                    },
                    include: [
                        {
                            model: model.classModel,
                            as: 'classGroup',
                            required: true,
                            where: {
                                term
                            }
                        }
                    ]
                }
            ],
            order: [['firstName', 'ASC']]
        });
        return result;
    } catch (error) {
        console.error("Error fetching students for schedule:", error);
        throw error;
    }
}

export async function allocateSeats(allocations, transaction) {
    try {
        return await model.studentExamSeatModel.bulkCreate(allocations, { transaction });
    } catch (error) {
        console.error("Error allocating seats:", error);
        throw error;
    }
}

export async function clearExistingAllocations(examScheduleRoomCapacityIds, transaction) {
    try {
        return await model.studentExamSeatModel.destroy({
            where: {
                examScheduleRoomCapacityId: { [Op.in]: examScheduleRoomCapacityIds }
            },
            transaction
        });
    } catch (error) {
        console.error("Error clearing existing allocations:", error);
        throw error;
    }
}
