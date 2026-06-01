import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";

export async function addExamStructureSchedule(examDetailSchedule) {
    try {
        return await model.examStructureScheduleMappingModel.create(examDetailSchedule);
    } catch (error) {
        console.error("Error adding exam Structure Schedule:", error);
        throw error;
    }
}

export async function getExamStructureSchedule(universityId, acedmicYearId, role, instituteId, examSetupTypeId) {
    const whereClause = {
        ...(examSetupTypeId && { examSetupTypeId }),
    };

    return await model.examSetupTypeModel.findAll({
        where: whereClause,
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.syllabusDetailsModel,
                as: "syllabusDetailsExam",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.subjectModel,
                        as: "syllabusSubject",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include: [
                            {
                                model: model.classSubjectMapperModel,
                                as: "subjects",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                include: [
                                    {
                                        model: model.teacherSubjectMappingModel,
                                        as: "employeeSubject",
                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                        include: [
                                            {
                                                model: model.employeeModel,
                                                as: "teacherEmployeeData",
                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                            },
                                        ],
                                    },
                                    {
                                        model: model.semesterModel,
                                        as: "semestermapping",
                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                        include: [
                                            {
                                                model: model.studentModel,
                                                as: "studentSemester",
                                                attributes: ["studentId", "firstName", "scholarNumber", "enrollNumber"],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                model: model.examSetupTypeTermModel,
                as: "examSetupTypeTerms",
                attributes: { exclude: ["createdAt", "updatedAt"] },
                include: [
                    {
                        model: model.examScheduleModel,
                        as: "examSchedules",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "answerSheetS3FileId"] },
                    },
                ],
            },
        ],
    });
}

export async function findSubjectAcedmicYearId(subjectId) {
    const subject = await model.subjectModel.findByPk(subjectId, {
        attributes: ["acedmicYearId"],
    });
    return subject?.acedmicYearId ?? null;
}

export async function updateExamSchedule(examScheduleId, data) {
    try {
        return await model.examScheduleModel.update(data, {
            where: { examScheduleId },
        });
    } catch (error) {
        console.error("Error updating exam Schedule:", error.message);
        throw error;
    }
}

export async function deleteExamSchedule(examScheduleId) {
    try {
        const deleted = await model.examScheduleModel.destroy({ where: { examScheduleId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam Schedule:", error);
        throw error;
    }
}

export async function publishExamSchedule(examSetupTypeId, data) {
    try {
        return await model.examSetupTypeModel.update(data, {
            where: { examSetupTypeId },
        });
    } catch (error) {
        console.error("Error updating exam Schedule:", error);
        throw error;
    }
}

export async function addExamSchedule(examDetail) {
    try {
        return await model.examScheduleModel.create(examDetail);
    } catch (error) {
        console.error("Error adding exam schedule:", error.message);
        throw error;
    }
}

export async function getDetailByExamType(examSetupTypeId) {
    try {
        return await model.examSetupTypeModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { examSetupTypeId },
            include: [
                {
                    model: model.examStructureScheduleMappingModel,
                    as: "examStructure",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.courseModel,
                            as: "courseExam",
                            attributes: ["courseName", "capacity"],
                        },
                        {
                            model: model.sessionModel,
                            as: "sessionExam",
                            attributes: ["sessionName"],
                        },
                        {
                            model: model.acedmicYearModel,
                            as: "acedmicExam",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error fetching exam structure details:", error.message);
        throw error;
    }
}

export async function getExamDetailByStudentId(studentId) {
    try {
        return await model.studentModel.findOne({
            attributes: ["studentId", "semesterId", "firstName"],
            where: { studentId },
            include: [
                {
                    model: model.semesterModel,
                    as: "studentSemester",
                    attributes: ["semesterId", "name"],
                    include: [
                        {
                            model: model.examScheduleModel,
                            as: "examSchedules",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "answerSheetS3FileId"] },
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: "subjectSchedule",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                                {
                                    model: model.examSetupTypeModel,
                                    as: "examSetupTypeSchedule",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                    where: { isPublish: true },
                                    required: true,
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error fetching exam structure details for student:", error.message);
        throw error;
    }
}

export async function getExamScheduleById(examScheduleId) {
    try {
        return await model.examScheduleModel.findByPk(examScheduleId, {
            include: [
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                },
                {
                    model: model.semesterModel,
                    as: "semesterexam",
                },
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerm",
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "examSetupType",
                        },
                    ],
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYearSchedule",
                },
            ],
        });
    } catch (error) {
        console.error("Error fetching exam schedule by id:", error.message);
        throw error;
    }
}

export async function getExamSetupTypeTermById(examSetupTypeTermId) {
    try {
        return await model.examSetupTypeTermModel.findByPk(examSetupTypeTermId);
    } catch (error) {
        console.error("Error fetching exam setup type term by id:", error.message);
        throw error;
    }
}

export async function findSubjectsWithSchedules(
    courseId,
    acedmicYearId,
    term,
    examSetupTypeTermId,
    sessionId
) {
    return model.subjectModel.findAll({
        where: {
            ...(courseId && { courseId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(term && { term }),
        },
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.examScheduleModel,
                as: "scheduleSubject",
                required: false,
                where: {
                    ...(sessionId && { sessionId }),
                },
                attributes: [
                    "examScheduleId",
                    "subjectId",
                    "semesterId",
                    "examSetupTypeTermId",
                    "acedmicYearId",
                    "sessionId",
                    "examDate",
                    "examTime",
                    "type",
                    "duration",
                    "createdBy",
                    "updatedBy",
                ],
                include: [
                    {
                        model: model.examSetupTypeTermModel,
                        where: { examSetupTypeTermId },
                        as: "examSetupTypeTerm",
                        attributes: { exclude: ["createdAt", "updatedAt"] },
                    },
                ],
            },
        ],
    });
}

export async function findRoomsByExamScheduleIds(examScheduleIds) {
    if (!examScheduleIds.length) {
        return [];
    }

    return model.examScheduleRoomCapacityModel.findAll({
        where: { examScheduleId: { [Op.in]: examScheduleIds } },
        attributes: [
            "examScheduleRoomCapacityId",
            "examScheduleId",
            "classRoomSectionId",
            "capacity",
            "columns",
            "orderKey",
        ],
        include: [
            {
                model: model.classRoomModel,
                as: "classRoom",
                attributes: ["roomNumber"],
            },
        ],
        order: [["orderKey", "ASC"]],
        raw: true,
        nest: true,
    });
}

export async function countStudentsForTerm(courseId, acedmicYearId, term, sessionId) {
    try {
        return await model.studentModel.count({
            include: [
                {
                    model: model.classSectionModel,
                    as: "studentSections",
                    required: true,
                    attributes: [],
                    where: {
                        courseId,
                        acedmicYearId,
                        ...(sessionId && { sessionId }),
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
                },
            ],
        });
    } catch (error) {
        console.error("Error fetching student count for term:", error.message);
        throw error;
    }
}

export async function findStudentsForTerm(courseId, acedmicYearId, term, sessionId) {
    try {
        return await model.studentModel.findAll({
            attributes: [
                "studentId",
                [
                    sequelize.fn(
                        "TRIM",
                        sequelize.fn(
                            "CONCAT_WS",
                            " ",
                            sequelize.col("students.first_name"),
                            sequelize.col("students.middle_name"),
                            sequelize.col("students.last_name")
                        )
                    ),
                    "name",
                ],
                "enrollNumber",
                "scholarNumber",
                "fatherName",
                "email",
                "phoneNumber",
                "mobileNumber",
                [sequelize.col("studentSections->courseSection.course_name"), "courseName"],
                [
                    sequelize.literal(
                        "COALESCE(`studentSections->semesterDetail`.`name`, `studentSections->classGroup`.`class_name`, CONCAT('Term ', `studentSections->classGroup`.`term`))"
                    ),
                    "termName",
                ],
            ],
            include: [
                {
                    model: model.classSectionModel,
                    as: "studentSections",
                    required: true,
                    attributes: [],
                    where: {
                        courseId,
                        acedmicYearId,
                        ...(sessionId && { sessionId }),
                    },
                    include: [
                        {
                            model: model.courseModel,
                            as: "courseSection",
                            required: true,
                            attributes: [],
                        },
                        {
                            model: model.semesterModel,
                            as: "semesterDetail",
                            required: false,
                            attributes: [],
                        },
                        {
                            model: model.classModel,
                            as: "classGroup",
                            required: true,
                            attributes: [],
                            where: { term },
                        },
                    ],
                },
            ],
            order: [
                [sequelize.col("students.first_name"), "ASC"],
                [sequelize.col("students.student_id"), "ASC"],
            ],
            subQuery: false,
            raw: true,
        });
    } catch (error) {
        console.error("Error fetching students for term:", error.message);
        throw error;
    }
}
