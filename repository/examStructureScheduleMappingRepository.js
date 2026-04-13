import * as model from "../models/index.js";

export async function addExamStructureSchedule(examDetailSchedule) {
    try {
        const result = await model.examStructureScheduleMappingModel.create(examDetailSchedule);
        return result;
    } catch (error) {
        console.error("Error adding exam Structure Schedule:", error);
        throw error;
    }
};

export async function getExamStructureSchedule(universityId, acedmicYearId, role, instituteId, examSetupTypeId) {

    const whereClause = {
        // ...(universityId && { universityId }),
        // ...(acedmicYearId && { acedmicYearId }),
        // ...(role === 'Head' && { instituteId }),
        ...(examSetupTypeId && { examSetupTypeId })
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
                        as: 'syllabusSubject',
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include: [
                            {
                                model: model.classSubjectMapperModel,
                                as: "subjects",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                include: [
                                    {
                                        model: model.teacherSubjectMappingModel,
                                        as: 'employeeSubject',
                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                        include: [
                                            {
                                                model: model.employeeModel,
                                                as: 'teacherEmployeeData',
                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                            }
                                        ]
                                    },
                                    {
                                        model: model.semesterModel,
                                        as: 'semestermapping',
                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                        include: [
                                            {
                                                model: model.studentModel,
                                                as: 'studentSemester',
                                                attributes: ['studentId', 'firstName', 'scholarNumber', 'enrollNumber']
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },

            // include exam schedules via the term join (exam_setup_type → term → schedule)
            {
                model: model.examSetupTypeTermModel,
                as: "examSetupTypeTerms",
                attributes: { exclude: ["createdAt", "updatedAt"] },
                include: [
                    {
                        model: model.examScheduleModel,
                        as: "examSchedules",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
                    }
                ]
            }
        ]
    });
};

export async function updateExamSchedule(examScheduleId, data) {
    try {
        if (!data.acedmicYearId && data.subjectId) {
            const subject = await model.subjectModel.findByPk(data.subjectId, {
                attributes: ['acedmicYearId']
            });
            if (subject) {
                data.acedmicYearId = subject.acedmicYearId;
            }
        }
        const result = await model.examScheduleModel.update(data, {
            where: { examScheduleId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam Schedule:", error.message);
        throw error;
    }
};

export async function deleteExamSchedule(examScheduleId) {
    try {
        const deleted = await model.examScheduleModel.destroy({ where: { examScheduleId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam Schedule:", error);
        throw error;
    }
};

export async function publishExamSchedule(examSetupTypeId, data) {
    try {
        const result = await model.examSetupTypeModel.update(data, {
            where: { examSetupTypeId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam Schedule:", error);
        throw error;
    }
};

export async function addExamSchedule(examDetail) {
    try {
        if (!examDetail.acedmicYearId && examDetail.subjectId) {
            const subject = await model.subjectModel.findByPk(examDetail.subjectId, {
                attributes: ['acedmicYearId']
            });
            if (subject) {
                examDetail.acedmicYearId = subject.acedmicYearId;
            }
        }
        const result = await model.examScheduleModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam schedule:", error.message);
        throw error;
    }
};

export async function getDetailByExamType(examSetupTypeId) {
    try {
        const result = await model.examSetupTypeModel.findOne({
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

        return result;
    } catch (error) {
        console.error("Error fetching exam structure details:", error.message);
        throw error;
    }
};

export async function getExamDetailByStudentId(studentId) {
    try {
        const result = await model.studentModel.findOne({
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
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: 'subjectSchedule',
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                                {
                                    model: model.examSetupTypeModel,
                                    as: "examSetupTypeSchedule",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                    where: { isPublish: true },
                                    required: true,
                                }
                            ]
                        },

                    ],
                },
            ],
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam structure details for student:", error.message);
        throw error;
    }
};

export async function getExamScheduleById(examScheduleId) {
    try {
        const result = await model.examScheduleModel.findByPk(examScheduleId, {
            include: [
                {
                    model: model.subjectModel,
                    as: 'subjectSchedule',
                },
                {
                    model: model.semesterModel,
                    as: 'semesterexam',
                },
                {
                    model: model.examSetupTypeModel,
                    as: 'examSetupTypeSchedule',
                },
                {
                    model: model.acedmicYearModel,
                    as: 'acedmicYearSchedule',
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam schedule by id:", error.message);
        throw error;
    }
}

export async function getSubjectsWithExamSchedule(courseId, acedmicYearId, term, examSetupTypeTermId) {
    try {
        const whereClause = {
            ...(courseId && { courseId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(term && { term })
        };

        const result = await model.subjectModel.findAll({
            where: whereClause,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.examScheduleModel,
                    as: "scheduleSubject",
                    required: false,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.examSetupTypeTermModel,
                            where: { examSetupTypeTermId },
                            as: "examSetupTypeTerm",
                            attributes: { exclude: ["createdAt", "updatedAt"] }
                        },
                    ]
                }
            ]
        });

        return result;
    } catch (error) {
        console.error("Error fetching subjects with exam schedule:", error.message);
        throw error;
    }
}