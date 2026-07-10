import { Op, fn, col, where } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from '../models/index.js';
import moment from "moment";
import { buildScope, scoped } from "../utility/scoped.js";
import { classSectionTermsInclude, studentClassSectionTermWithSectionInclude, timeTableRoutineClassSectionInclude } from "../utility/classSectionIncludes.js";

export async function addAttendance(attendanceRecords, options = {}) {
    try {
        return await scoped(model.attendanceModel).bulkCreate(attendanceRecords, options);
    } catch (error) {
        console.error("Error in adding attendance:", error);
        throw error;
    }
};

export async function checkAttendanceExists(timeTableMappingId, date) {
    try {
        const count = await scoped(model.attendanceModel).count({
            where: {
                timeTableMappingId,
                date: { [Op.eq]: fn("DATE", date) },
            },
        });
        return count > 0;
    } catch (error) {
        console.error("Error checking attendance existence:", error);
        throw error;
    }
};

export async function getAttendanceRowsByMappingAndDate(timeTableMappingId, date) {
    try {
        return await scoped(model.attendanceModel).findAll({
            attributes: [
                'studentId',
                'attendanceStatus',
                'notes',
                'description',
            ],
            where: {
                timeTableMappingId: Number(timeTableMappingId),
                date: { [Op.eq]: fn("DATE", date) },
            },
            raw: true,
        });
    } catch (error) {
        console.error("Error in getAttendanceRowsByMappingAndDate:", error);
        throw error;
    }
};

export async function getNextPeriodsOnSameDay(timeTableRoutineId, day, afterPeriod) {
    try {
        return await model.classScheduleModel.findAll({
            where: {
                timeTableRoutineId: Number(timeTableRoutineId),
                day,
                period: { [Op.gt]: Number(afterPeriod) },
                deletedAt: null,
                isAttendence: true,
            },
            attributes: [
                'timeTableMappingId',
                'period',
                'day',
                'employeeId',
                'isSameTeacher',
            ],
            include: [
                {
                    model: model.timeTableRoutineModel,
                    as: 'timeTablecreate',
                    attributes: ['timeTableRoutineId', 'classSectionTermId', 'startingDate', 'endingDate'],
                    required: true,
                    include: [
                        timeTableRoutineClassSectionInclude({
                            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
                            sectionAttributes: ['classSectionsId', 'year', 'section'],
                        }),
                    ],
                },
                {
                    model: model.timeTableStructurePeriodsModel,
                    as: 'timeTablecreation',
                    attributes: ['periodName', 'startTime', 'endTime', 'isBreak'],
                    required: true,
                    where: {
                        isBreak: false,
                    },
                },
                {
                    model: model.subjectModel,
                    as: 'timeTableSubject',
                    attributes: ['subjectId', 'subjectName'],
                },
                {
                    model: model.electiveSubjectModel,
                    as: 'timeTableElective',
                    attributes: ['electiveSubjectId', 'electiveSubjectName'],
                },
                {
                    model: model.teacherSubjectMappingModel,
                    as: 'timeTableTeacherSubject',
                    attributes: ['teacherSubjectMappingId'],
                    include: [
                        {
                            model: model.subjectModel,
                            as: 'employeeSubject',
                            attributes: ['subjectId', 'subjectName'],
                        },
                    ],
                },
            ],
            order: [['period', 'ASC']],
            raw: true,
            nest: true,
        });
    } catch (error) {
        console.error("Error in getNextPeriodsOnSameDay:", error);
        throw error;
    }
};

export async function getMarkedTimeTableMappingIdsOnDate(mappingIds, date) {
    try {
        const uniqueIds = [...new Set(mappingIds.map((id) => Number(id)).filter(Boolean))];
        if (!uniqueIds.length) {
            return new Set();
        }

        const rows = await scoped(model.attendanceModel).findAll({
            attributes: ['timeTableMappingId'],
            where: {
                timeTableMappingId: { [Op.in]: uniqueIds },
                date: { [Op.eq]: fn("DATE", date) },
            },
            raw: true,
        });

        const markedIds = new Set();
        for (const row of rows) {
            markedIds.add(Number(row.timeTableMappingId));
        }

        return markedIds;
    } catch (error) {
        console.error("Error in getMarkedTimeTableMappingIdsOnDate:", error);
        throw error;
    }
};

export async function getAttendanceDetails() {
    try {
        return await scoped(model.attendanceModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "class_sections_id", "student_id"] },
            include: [
                {
                    model: model.userModel,
                    as: "userAttendence",
                    attributes: ["universityId", "userId"],
                },
                {
                    model: model.classSectionModel,
                    as: "classAttendance",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "course_id", "semester_id", "class_id", "acedmic_year_id", "specialization_id", "session_id"] },
                },
                {
                    model: model.studentModel,
                    as: "studentAttendance",
                    attributes: ["firstName", "middleName", "lastName", "scholarNumber"],
                },
                {
                    model: model.classScheduleModel,
                    as: 'timeTableMapping',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "teacher_subject_mapping_id", "time_table_routine_id", "time_table_creation_id", "class_room_section_id", "elective_subject_id", "subject_id"] },
                    include: [
                        {
                            model: model.employeeModel,
                            as: 'employeeDetails',
                            attributes: ["employeeId", "campusId", "instituteId", "employeeCode", "employeeName"],
                        },
                        {
                            model: model.electiveSubjectModel,
                            as: 'timeTableElective',
                            attributes: ["electiveSubjectName", "electiveSubjectCode"],
                        },
                        {
                            model: model.subjectModel,
                            as: 'timeTableSubject',
                            attributes: ["subjectName", "subjectCode"],
                        },
                        {
                            model: model.timeTableRoutineModel,
                            as: 'timeTablecreate',
                            attributes: ['classSectionTermId', 'timeTableType'],
                        },
                        {
                            model: model.teacherSubjectMappingModel,
                            as: 'timeTableTeacherSubject',
                            attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "deletedAt", "employee_id", "class_subject_mapper_id"] },
                            include: [
                                {
                                    model: model.classSubjectMapperModel,
                                    as: 'employeeSubject',
                                    attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "deletedAt", "semester_id", "subject_id"] },
                                    include: [
                                        {
                                            model: model.subjectModel,
                                            as: 'subjects',
                                            attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "deletedAt"] },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching attendance details:', error);
        throw error;
    }
};

export async function updateAttendance(attendanceId, record) {
    try {
        const existing = await scoped(model.attendanceModel).findOne({
            where: { attendanceId },
            attributes: ['attendanceId'],
        });
        if (!existing) {
            return [0];
        }

        return await scoped(model.attendanceModel).update(record, {
            where: { attendanceId },
        });
    } catch (error) {
        console.error(`Error updating attendance ${attendanceId}:`, error);
        throw error;
    }
};

export async function addImportAttendance(attendanceRecords) {
    try {
        return await scoped(model.attendanceModel).create(attendanceRecords);
    } catch (error) {
        console.error("Error in adding attendance bulk import:", error);
        throw error;
    }
};

export async function getAttendanceByDate(date, classSectionTermId, employeeId) {
    try {
        const attendanceDetails = await scoped(model.attendanceModel).findAll({
            attributes: {
                exclude: [
                    "createdAt",
                    "updatedAt",
                    "deletedAt",
                    "createdBy",
                    "updatedBy",
                    "class_sections_id",
                    "studentId",
                ],
            },
            where: {
                classSectionTermId: Number(classSectionTermId),
                date: { [Op.eq]: fn("DATE", date) },
            },
            include: [
                {
                    model: model.classSectionModel,
                    as: "classAttendance",
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "deletedAt",
                            "createdBy",
                            "course_id",
                            "semester_id",
                            "class_id",
                            "acedmic_year_id",
                            "specialization_id",
                            "session_id",
                        ],
                    },
                    include: [
                        {
                            model: model.courseModel,
                            as: "courseSection",
                        },
                    ],
                },
                {
                    model: model.studentModel,
                    as: "studentAttendance",
                    attributes: [
                        "firstName",
                        "middleName",
                        "lastName",
                        "scholarNumber",
                        "enrollNumber",
                    ],
                },
            ],
        });

        const employee = await scoped(model.employeeModel).findOne({
            where: { employeeId },
            attributes: ['employeeId'],
        });

        const subjectDetail = employee
            ? await model.teacherSubjectMappingModel.findOne({
                attributes: {
                    exclude: [
                        "createdAt",
                        "updatedAt",
                        "deletedAt",
                        "createdBy",
                        "updatedBy",
                    ],
                },
                where: { employeeId },
                include: [
                    {
                        model: model.classSubjectMapperModel,
                        as: "employeeSubject",
                        attributes: {
                            exclude: [
                                "createdAt",
                                "updatedAt",
                                "deletedAt",
                                "createdBy",
                                "updatedBy",
                            ],
                        },
                        include: [
                            {
                                model: model.subjectModel,
                                as: "subjects",
                                attributes: {
                                    exclude: [
                                        "createdAt",
                                        "updatedAt",
                                        "deletedAt",
                                        "createdBy",
                                        "updatedBy",
                                    ],
                                },
                            },
                        ],
                    },
                ],
            })
            : null;

        return {
            attendanceDetails,
            subjectDetail,
        };
    } catch (error) {
        console.error("Error fetching attendance:", error);
        throw error;
    }
};

export async function getTimetable(timeTableRoutineId) {
    return await scoped(model.timeTableRoutineModel).findOne({
        where: {
            timeTableRoutineId,
            deletedAt: null,
        },
        attributes: [
            "timeTableRoutineId",
            "startingDate",
            "endingDate",
        ],
        include: [
            {
                model: model.timeTableStructurePeriodsModel,
                as: "timeTablecreation",
                attributes: ["weekOff"],
                required: true,
            },
        ],
    });
}

export async function getAttendanceMap(mappingIds, from, to) {
    if (!mappingIds.length) {
        return {};
    }

    const dateCol = sequelize.col("date");

    const rows = await scoped(model.attendanceModel).findAll({
        attributes: [
            "timeTableMappingId",
            [fn("DATE", dateCol), "attendanceDate"],
            [fn("COUNT", sequelize.col("student_id")), "presentCount"],
        ],
        where: {
            timeTableMappingId: mappingIds,
            attendanceStatus: "Present",
            [Op.and]: [
                where(fn("DATE", dateCol), { [Op.gte]: from }),
                where(fn("DATE", dateCol), { [Op.lte]: to }),
            ],
        },
        group: ["timeTableMappingId", fn("DATE", dateCol)],
        raw: true,
    });

    const map = {};
    for (const r of rows) {
        const dateKey = moment(r.attendanceDate).format("YYYY-MM-DD");
        const key = `${r.timeTableMappingId}_${dateKey}`;
        map[key] = Number(r.presentCount);
    }

    return map;
}

export async function getAttendanceMarkedMap(mappingIds, from, to) {
    if (!mappingIds.length) {
        return {};
    }

    const dateCol = sequelize.col("date");

    const rows = await scoped(model.attendanceModel).findAll({
        attributes: [
            "timeTableMappingId",
            [fn("DATE", dateCol), "attendanceDate"],
            [fn("COUNT", sequelize.col("student_id")), "markedCount"],
        ],
        where: {
            timeTableMappingId: mappingIds,
            [Op.and]: [
                where(fn("DATE", dateCol), { [Op.gte]: from }),
                where(fn("DATE", dateCol), { [Op.lte]: to }),
            ],
        },
        group: ["timeTableMappingId", fn("DATE", dateCol)],
        raw: true,
    });

    const map = {};
    for (const r of rows) {
        const dateKey = moment(r.attendanceDate).format("YYYY-MM-DD");
        const key = `${r.timeTableMappingId}_${dateKey}`;
        map[key] = Number(r.markedCount);
    }

    return map;
}

export async function getStudentCount(classSectionsId) {
    return await scoped(model.studentModel).count({
        where: {
            classSectionsId,
            deletedAt: null,
        },
    });
};

export async function getTeacherMappings(employeeId) {
    const employee = await scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
    });
    if (!employee) {
        return [];
    }

    return await model.classScheduleModel.findAll({
        where: {
            [Op.or]: [
                { employeeId },
                { "$timeTableTeacherSubject.employee_id$": employeeId },
            ],
        },
        include: [
            {
                model: model.teacherSubjectMappingModel,
                as: "timeTableTeacherSubject",
                required: false,
            },
            {
                model: model.subjectModel,
                as: "timeTableSubject",
                required: false,
            },
            {
                model: model.timeTableRoutineModel,
                as: "timeTablecreate",
                required: true,
                where: buildScope(model.timeTableRoutineModel),
                include: [
                    {
                        model: model.classSectionModel,
                        as: "timeTableClassSection",
                        required: false,
                        include: [classSectionTermsInclude()],
                    },
                ],
            },
            {
                model: model.timeTableStructurePeriodsModel,
                as: "timeTablecreation",
                required: true,
            },
        ],
    });
};

export async function getStudentAttendanceReport(classSectionsId, subjectId, employeeId) {
    try {
        const employee = await scoped(model.employeeModel).findOne({
            where: { employeeId },
            attributes: ['employeeId'],
        });
        if (!employee) {
            return [];
        }

        return await scoped(model.studentModel).findAll({
            where: { classSectionsId, deletedAt: null },
            attributes: ['studentId', 'firstName', 'middleName', 'lastName', 'scholarNumber', 'enrollNumber'],
            include: [
                {
                    model: model.attendanceModel,
                    as: 'studentAttendance',
                    required: false,
                    attributes: ['attendanceId', 'date', 'attendanceStatus'],
                    include: [
                        {
                            model: model.classScheduleModel,
                            as: 'timeTableMapping',
                            required: true,
                            where: {
                                employeeId,
                                subjectId,
                            },
                            attributes: ['timeTableMappingId'],
                            include: [
                                {
                                    model: model.timeTableStructurePeriodsModel,
                                    as: 'timeTablecreation',
                                    attributes: ['timeTableCreationId', 'periodName'],
                                    where: {
                                        isBreak: false,
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error in getStudentAttendanceReport:", error);
        throw error;
    }
};

export async function getEmployeeScheduleWithRoutine(classSectionTermId, subjectId, employeeId) {
    try {
        const employee = await scoped(model.employeeModel).findOne({
            where: { employeeId },
            attributes: ['employeeId'],
        });
        if (!employee) {
            return [];
        }

        return await model.classScheduleModel.findAll({
            where: {
                subjectId,
                employeeId,
                deletedAt: null,
            },
            include: [
                {
                    model: model.timeTableRoutineModel,
                    as: 'timeTablecreate',
                    attributes: ['timeTableRoutineId', 'startingDate', 'endingDate', 'classSectionTermId'],
                    required: true,
                    where: {
                        classSectionTermId: Number(classSectionTermId),
                        ...buildScope(model.timeTableRoutineModel),
                    },
                },
                {
                    model: model.timeTableStructurePeriodsModel,
                    as: 'timeTablecreation',
                    attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
                    required: true,
                },
            ],
        });
    } catch (error) {
        console.error("Error in getEmployeeScheduleWithRoutine:", error);
        throw error;
    }
}

export async function getStudentsBatchAttendance(classSectionTermId, filters) {
    try {
        return await scoped(model.studentModel).findAll({
            where: {
                classSectionTermId: Number(classSectionTermId),
                deletedAt: null,
            },
            attributes: ['studentId', 'firstName', 'middleName', 'lastName', 'scholarNumber', 'enrollNumber'],
            include: [
                {
                    model: model.attendanceModel,
                    as: 'studentAttendance',
                    required: false,
                    attributes: ['attendanceId', 'date', 'attendanceStatus', 'timeTableMappingId'],
                    where: {
                        [Op.or]: filters.map(f => ({
                            date: { [Op.eq]: fn("DATE", f.date) },
                            timeTableMappingId: f.timeTableMappingId,
                        })),
                    },
                },
            ],
        });
    } catch (error) {
        console.error("Error in getStudentsBatchAttendance:", error);
        throw error;
    }
}

export async function getStudentsByScholarNumbers(scholarNumbers) {
    try {
        return await scoped(model.studentModel).findAll({
            where: {
                scholarNumber: { [Op.in]: scholarNumbers },
                deletedAt: null,
            },
            attributes: ['studentId', 'scholarNumber'],
            include: [studentClassSectionTermWithSectionInclude({ termAttributes: ['classSectionsId'] })],
        });
    } catch (error) {
        console.error("Error in getStudentsByScholarNumbers:", error);
        throw error;
    }
}

export async function getStudentsByIds(studentIds) {
    try {
        return await scoped(model.studentModel).findAll({
            where: {
                studentId: { [Op.in]: studentIds },
                deletedAt: null,
            },
            attributes: ['studentId', 'scholarNumber'],
            include: [studentClassSectionTermWithSectionInclude({ termAttributes: ['classSectionsId'] })],
        });
    } catch (error) {
        console.error("Error in getStudentsByIds:", error);
        throw error;
    }
}

export async function getDetailsByTerm(classSectionTermId, subjectId, employeeId) {
    try {
        const [termDetails, subjectDetails, employeeDetails] = await Promise.all([
            scoped(model.classSectionTermModel).findOne({
                where: { classSectionTermId: Number(classSectionTermId) },
                attributes: ['classSectionTermId', 'term', 'classSectionsId'],
                include: [
                    {
                        model: model.classSectionModel,
                        as: 'classSection',
                        attributes: ['year', 'section'],
                        required: false,
                    },
                ],
            }),
            scoped(model.subjectModel).findOne({
                where: { subjectId, deletedAt: null },
                attributes: ['subjectName', 'subjectCode'],
            }),
            scoped(model.employeeModel).findOne({
                where: { employeeId, deletedAt: null },
                attributes: ['employeeName', 'employeeCode'],
            }),
        ]);

        return {
            termDetails,
            sectionDetails: termDetails?.classSection ?? null,
            subjectDetails,
            employeeDetails,
        };
    } catch (error) {
        console.error("Error in getDetailsByTerm:", error);
        throw error;
    }
}
