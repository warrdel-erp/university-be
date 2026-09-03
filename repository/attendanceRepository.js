import { Op, fn, where } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from '../models/index.js';
import moment from "moment";
import { ATTENDANCE_PRESENT_STATUSES } from "../constant.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { studentClassSectionTermWithSectionInclude, timeTableRoutineClassSectionInclude } from "../utility/classSectionIncludes.js";

export async function addAttendance(attendanceRecords, options = {}) {
    try {
        return await scoped(model.attendanceModel).bulkCreate(attendanceRecords, options);
    } catch (error) {
        console.error("Error in adding attendance:", error);
        throw error;
    }
};

export async function checkAttendanceExists(timeTableCellDateWiseId) {
    try {
        const count = await scoped(model.attendanceModel).count({
            where: {
                timeTableCellDateWiseId: Number(timeTableCellDateWiseId),
            },
        });
        return count > 0;
    } catch (error) {
        console.error("Error checking attendance existence:", error);
        throw error;
    }
};

export async function getAttendanceRowsByDateWiseId(timeTableCellDateWiseId) {
    try {
        return await scoped(model.attendanceModel).findAll({
            attributes: [
                'studentId',
                'attendanceStatus',
                'notes',
                'description',
                'classSectionsId',
            ],
            where: {
                timeTableCellDateWiseId: Number(timeTableCellDateWiseId),
            },
            raw: true,
        });
    } catch (error) {
        console.error("Error in getAttendanceRowsByDateWiseId:", error);
        throw error;
    }
};

export async function getNextDateWisePeriodsOnSameDay(timeTableRoutineId, date, afterPeriod) {
    try {
        return await model.timeTableCellDateWiseModel.findAll({
            where: {
                date,
            },
            attributes: [
                'timeTableCellDateWiseId',
                'timeTableCellId',
                'date',
                'classRoomSectionId',
            ],
            include: [
                {
                    model: model.timeTableCellTeachersDateWiseModel,
                    as: 'timeTableCellTeachersDateWise',
                    attributes: ['timeTableCellTeachersDateWiseId', 'userId', 'teacherType'],
                    required: false,
                },
                {
                    model: model.timeTableCellModel,
                    as: 'timeTableCell',
                    required: true,
                    where: {
                        timeTableRoutineId: Number(timeTableRoutineId),
                        period: { [Op.gt]: Number(afterPeriod) },
                        isAttendence: true,
                    },
                    attributes: [
                        'timeTableCellId',
                        'period',
                        'day',
                        'isSameTeacher',
                        'subjectId',
                        'electiveSubjectId',
                        'teacherSubjectMappingId',
                        'timeTableRoutineId',
                    ],
                    include: [
                        {
                            model: model.timeTableCellTeachersModel,
                            as: 'timeTableCellTeachers',
                            attributes: ['timeTableCellTeacherId', 'userId', 'teacherType'],
                            required: false,
                        },
                        {
                            model: model.timeTableRoutineModel,
                            as: 'timeTableRoutine',
                            attributes: ['timeTableRoutineId', 'classSectionTermId', 'startingDate', 'endingDate'],
                            required: true,
                            where: buildScope(model.timeTableRoutineModel),
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
                            where: { isBreak: false },
                        },
                        {
                            model: model.subjectModel,
                            as: 'timeTableSubject',
                            attributes: ['subjectId', 'subjectName'],
                            required: false,
                        },
                        {
                            model: model.electiveSubjectModel,
                            as: 'timeTableElective',
                            attributes: ['electiveSubjectId', 'electiveSubjectName'],
                            required: false,
                        },
                        {
                            model: model.teacherSubjectMappingModel,
                            as: 'timeTableTeacherSubject',
                            attributes: ['teacherSubjectMappingId', 'userId'],
                            required: false,
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: 'employeeSubject',
                                    attributes: ['subjectId', 'subjectName'],
                                    required: false,
                                },
                            ],
                        },
                    ],
                },
            ],
            order: [[{ model: model.timeTableCellModel, as: 'timeTableCell' }, 'period', 'ASC']],
        });
    } catch (error) {
        console.error("Error in getNextDateWisePeriodsOnSameDay:", error);
        throw error;
    }
};

export async function getMarkedDateWiseIds(dateWiseIds) {
    try {
        const uniqueIds = [...new Set(dateWiseIds.map((id) => Number(id)).filter(Boolean))];
        if (!uniqueIds.length) {
            return new Set();
        }

        const rows = await scoped(model.attendanceModel).findAll({
            attributes: ['timeTableCellDateWiseId'],
            where: {
                timeTableCellDateWiseId: { [Op.in]: uniqueIds },
            },
            raw: true,
        });

        const markedIds = new Set();
        for (const row of rows) {
            markedIds.add(Number(row.timeTableCellDateWiseId));
        }

        return markedIds;
    } catch (error) {
        console.error("Error in getMarkedDateWiseIds:", error);
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
                    model: model.timeTableCellDateWiseModel,
                    as: 'timeTableCellDateWise',
                    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date'],
                    required: false,
                    include: [
                        {
                            model: model.timeTableCellModel,
                            as: 'timeTableCell',
                            attributes: [
                                'timeTableCellId',
                                'subjectId',
                                'electiveSubjectId',
                                'isSameTeacher',
                                'day',
                                'period',
                            ],
                            include: [
                                {
                                    model: model.timeTableCellTeachersModel,
                                    as: 'timeTableCellTeachers',
                                    attributes: ['userId', 'teacherType', 'isAttendence'],
                                    required: false,
                                    include: [
                                        {
                                            model: model.employeeModel,
                                            as: 'employeeDetails',
                                            attributes: ['userId', 'campusId', 'instituteId', 'employeeCode', 'employeeName'],
                                            required: false,
                                        },
                                    ],
                                },
                                {
                                    model: model.electiveSubjectModel,
                                    as: 'timeTableElective',
                                    attributes: ['electiveSubjectName', 'electiveSubjectCode'],
                                    required: false,
                                },
                                {
                                    model: model.subjectModel,
                                    as: 'timeTableSubject',
                                    attributes: ['subjectName', 'subjectCode', 'subjectId'],
                                    required: false,
                                },
                                {
                                    model: model.timeTableRoutineModel,
                                    as: 'timeTableRoutine',
                                    attributes: ['classSectionTermId', 'timeTableType'],
                                    required: false,
                                },
                                {
                                    model: model.teacherSubjectMappingModel,
                                    as: 'timeTableTeacherSubject',
                                    attributes: ['teacherSubjectMappingId', 'userId'],
                                    required: false,
                                    include: [
                                        {
                                            model: model.subjectModel,
                                            as: 'employeeSubject',
                                            attributes: ['subjectId', 'subjectName', 'subjectCode'],
                                            required: false,
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

export async function getAttendanceByDate(date, classSectionTermId, userId) {
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
            where: { userId },
            attributes: ['userId'],
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
                where: { userId },
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

export async function getAttendanceMap({ dateWiseIds = [], mappingIds = [], from, to } = {}) {
    const map = {};
    const dateCol = sequelize.col("date");

    if (dateWiseIds.length) {
        const rows = await scoped(model.attendanceModel).findAll({
            attributes: [
                "timeTableCellDateWiseId",
                [fn("COUNT", sequelize.col("student_id")), "presentCount"],
            ],
            where: {
                timeTableCellDateWiseId: { [Op.in]: dateWiseIds },
                attendanceStatus: { [Op.in]: ATTENDANCE_PRESENT_STATUSES },
            },
            group: ["timeTableCellDateWiseId"],
            raw: true,
        });
        for (const r of rows) {
            map[`dw:${r.timeTableCellDateWiseId}`] = Number(r.presentCount);
        }
    }

    if (mappingIds.length && from && to) {
        const rows = await scoped(model.attendanceModel).findAll({
            attributes: [
                "timeTableCellId",
                [fn("DATE", dateCol), "attendanceDate"],
                [fn("COUNT", sequelize.col("student_id")), "presentCount"],
            ],
            where: {
                timeTableCellId: { [Op.in]: mappingIds },
                timeTableCellDateWiseId: null,
                attendanceStatus: { [Op.in]: ATTENDANCE_PRESENT_STATUSES },
                [Op.and]: [
                    where(fn("DATE", dateCol), { [Op.gte]: from }),
                    where(fn("DATE", dateCol), { [Op.lte]: to }),
                ],
            },
            group: ["timeTableCellId", fn("DATE", dateCol)],
            raw: true,
        });
        for (const r of rows) {
            const dateKey = moment(r.attendanceDate).format("YYYY-MM-DD");
            map[`m:${r.timeTableCellId}_${dateKey}`] = Number(r.presentCount);
        }
    }

    return map;
}

export async function getAttendanceMarkedMap({ dateWiseIds = [], mappingIds = [], from, to } = {}) {
    const map = {};
    const dateCol = sequelize.col("date");

    if (dateWiseIds.length) {
        const rows = await scoped(model.attendanceModel).findAll({
            attributes: [
                "timeTableCellDateWiseId",
                [fn("COUNT", sequelize.col("student_id")), "markedCount"],
            ],
            where: {
                timeTableCellDateWiseId: { [Op.in]: dateWiseIds },
            },
            group: ["timeTableCellDateWiseId"],
            raw: true,
        });
        for (const r of rows) {
            map[`dw:${r.timeTableCellDateWiseId}`] = Number(r.markedCount);
        }
    }

    if (mappingIds.length && from && to) {
        const rows = await scoped(model.attendanceModel).findAll({
            attributes: [
                "timeTableCellId",
                [fn("DATE", dateCol), "attendanceDate"],
                [fn("COUNT", sequelize.col("student_id")), "markedCount"],
            ],
            where: {
                timeTableCellId: { [Op.in]: mappingIds },
                timeTableCellDateWiseId: null,
                [Op.and]: [
                    where(fn("DATE", dateCol), { [Op.gte]: from }),
                    where(fn("DATE", dateCol), { [Op.lte]: to }),
                ],
            },
            group: ["timeTableCellId", fn("DATE", dateCol)],
            raw: true,
        });
        for (const r of rows) {
            const dateKey = moment(r.attendanceDate).format("YYYY-MM-DD");
            map[`m:${r.timeTableCellId}_${dateKey}`] = Number(r.markedCount);
        }
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

export async function getTeacherDateWiseSessions(userId) {
    return model.timeTableCellDateWiseModel.findAll({
        attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
        include: [
            {
                model: model.timeTableCellTeachersDateWiseModel,
                as: 'timeTableCellTeachersDateWise',
                required: true,
                where: { userId: Number(userId) },
                attributes: ['userId', 'teacherType', 'isAttendence'],
            },
            {
                model: model.timeTableCellModel,
                as: 'timeTableCell',
                required: true,
                attributes: [
                    'timeTableCellId',
                    'period',
                    'day',
                    'subjectId',
                    'electiveSubjectId',
                    'isSameTeacher',
                    'timeTableRoutineId',
                ],
                include: [
                    {
                        model: model.timeTableRoutineModel,
                        as: 'timeTableRoutine',
                        required: true,
                        attributes: [
                            'timeTableRoutineId',
                            'classSectionTermId',
                            'startingDate',
                            'endingDate',
                        ],
                        where: {
                            is_publish: true,
                            ...buildScope(model.timeTableRoutineModel),
                        },
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
                        required: true,
                        attributes: ['periodName', 'startTime', 'endTime', 'isBreak'],
                        where: { isBreak: false },
                    },
                    {
                        model: model.subjectModel,
                        as: 'timeTableSubject',
                        attributes: ['subjectId', 'subjectName'],
                        required: false,
                    },
                    {
                        model: model.electiveSubjectModel,
                        as: 'timeTableElective',
                        attributes: ['electiveSubjectId', 'electiveSubjectName'],
                        required: false,
                    },
                ],
            },
        ],
        order: [['date', 'DESC']],
    });
}

export async function getStudentAttendanceReport(classSectionsId, subjectId, userId) {
    try {
        const employee = await scoped(model.employeeModel).findOne({
            where: { userId },
            attributes: ['userId'],
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
                    attributes: ['attendanceId', 'date', 'attendanceStatus', 'timeTableCellDateWiseId'],
                    include: [
                        {
                            model: model.timeTableCellDateWiseModel,
                            as: 'timeTableCellDateWise',
                            required: true,
                            attributes: ['timeTableCellDateWiseId', 'date'],
                            include: [
                                {
                                    model: model.timeTableCellTeachersDateWiseModel,
                                    as: 'timeTableCellTeachersDateWise',
                                    required: true,
                                    where: { userId: Number(userId) },
                                    attributes: ['userId'],
                                },
                                {
                                    model: model.timeTableCellModel,
                                    as: 'timeTableCell',
                                    required: true,
                                    where: { subjectId: Number(subjectId) },
                                    attributes: ['timeTableCellId', 'subjectId', 'period'],
                                    include: [
                                        {
                                            model: model.timeTableStructurePeriodsModel,
                                            as: 'timeTablecreation',
                                            attributes: ['timeTableCreationId', 'periodName'],
                                            where: { isBreak: false },
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
        console.error("Error in getStudentAttendanceReport:", error);
        throw error;
    }
};

export async function getStudentsBatchAttendance(classSectionTermId, filters = []) {
    try {
        const dateWiseIds = [];
        const seen = new Set();
        for (const filter of filters || []) {
            const id = Number(filter.timeTableCellDateWiseId);
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            dateWiseIds.push(id);
        }

        const termId = Number(classSectionTermId);
        const includes = [
            studentClassSectionTermWithSectionInclude({
                classSectionTermId: termId,
                termRequired: false,
                sectionRequired: false,
                includeSectionTerms: false,
            }),
            {
                model: model.attendanceModel,
                as: 'studentAttendance',
                required: false,
                separate: true,
                attributes: [
                    'attendanceId',
                    'date',
                    'attendanceStatus',
                    'timeTableCellDateWiseId',
                    'timeTableCellId',
                    'notes',
                    'description',
                ],
                ...(dateWiseIds.length > 0
                    ? { where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } } }
                    : {}),
            },
        ];

        return await scoped(model.studentModel).findAll({
            where: {
                classSectionTermId: termId,
                deletedAt: null,
            },
            attributes: [
                'studentId',
                'firstName',
                'middleName',
                'lastName',
                'scholarNumber',
                'enrollNumber',
                'classSectionTermId',
            ],
            include: includes,
            order: [
                ['scholarNumber', 'ASC'],
                ['firstName', 'ASC'],
            ],
        });
    } catch (error) {
        console.error("Error in getStudentsBatchAttendance:", error);
        throw error;
    }
}

export async function getStudentsByElectiveSubjectWithBatchAttendance(electiveSubjectId, filters = []) {
    try {
        const dateWiseIds = [];
        const seen = new Set();
        for (const filter of filters || []) {
            const id = Number(filter.timeTableCellDateWiseId);
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            dateWiseIds.push(id);
        }

        return await scoped(model.studentModel).findAll({
            where: { deletedAt: null },
            attributes: [
                'studentId',
                'firstName',
                'middleName',
                'lastName',
                'scholarNumber',
                'enrollNumber',
                'classSectionTermId',
            ],
            include: [
                {
                    model: model.studentElectiveSubjectModel,
                    as: 'electiveSubjectMappings',
                    attributes: ['studentElectiveSubjectId', 'electiveSubjectId'],
                    where: { electiveSubjectId: Number(electiveSubjectId) },
                    required: true,
                },
                {
                    model: model.attendanceModel,
                    as: 'studentAttendance',
                    required: false,
                    separate: true,
                    attributes: [
                        'attendanceId',
                        'date',
                        'attendanceStatus',
                        'timeTableCellDateWiseId',
                        'timeTableCellId',
                        'notes',
                        'description',
                    ],
                    ...(dateWiseIds.length > 0
                        ? { where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } } }
                        : {}),
                },
            ],
            order: [
                ['scholarNumber', 'ASC'],
                ['firstName', 'ASC'],
            ],
        });
    } catch (error) {
        console.error("Error in getStudentsByElectiveSubjectWithBatchAttendance:", error);
        throw error;
    }
}

export async function getStudentsByAcademicGroupWithBatchAttendance(academicGroupId, filters = []) {
    try {
        const dateWiseIds = [];
        const seen = new Set();
        for (const filter of filters || []) {
            const id = Number(filter.timeTableCellDateWiseId);
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            dateWiseIds.push(id);
        }

        return await scoped(model.studentModel).findAll({
            where: { deletedAt: null },
            attributes: [
                'studentId',
                'firstName',
                'middleName',
                'lastName',
                'scholarNumber',
                'enrollNumber',
                'classSectionTermId',
            ],
            include: [
                {
                    model: model.academicGroupStudentModel,
                    as: 'academicGroupStudents',
                    attributes: ['academicGroupStudentId', 'academicGroupId'],
                    where: { academicGroupId: Number(academicGroupId) },
                    required: true,
                },
                {
                    model: model.attendanceModel,
                    as: 'studentAttendance',
                    required: false,
                    separate: true,
                    attributes: [
                        'attendanceId',
                        'date',
                        'attendanceStatus',
                        'timeTableCellDateWiseId',
                        'timeTableCellId',
                        'notes',
                        'description',
                    ],
                    ...(dateWiseIds.length > 0
                        ? { where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } } }
                        : {}),
                },
            ],
            order: [
                ['scholarNumber', 'ASC'],
                ['firstName', 'ASC'],
            ],
        });
    } catch (error) {
        console.error("Error in getStudentsByAcademicGroupWithBatchAttendance:", error);
        throw error;
    }
}

/**
 * Batch-load date-wise cells with their real timeTableCell FK parent.
 * Missing ids simply omit rows — callers must not invent replacements.
 */
export async function findDateWiseCellsByIds(timeTableCellDateWiseIds) {
    const ids = [];
    const seen = new Set();
    for (const raw of timeTableCellDateWiseIds || []) {
        const id = Number(raw);
        if (!id || seen.has(id)) {
            continue;
        }
        seen.add(id);
        ids.push(id);
    }

    if (ids.length === 0) {
        return [];
    }

    return model.timeTableCellDateWiseModel.findAll({
        where: { timeTableCellDateWiseId: { [Op.in]: ids } },
        attributes: [
            'timeTableCellDateWiseId',
            'timeTableCellId',
            'date',
            'classRoomSectionId',
            'subjectId',
            'electiveSubjectId',
        ],
        include: [
            {
                model: model.timeTableCellModel,
                as: 'timeTableCell',
                required: true,
                attributes: [
                    'timeTableCellId',
                    'timeTableRoutineId',
                    'timeTableCreationId',
                    'period',
                    'day',
                    'subjectId',
                    'electiveSubjectId',
                    'timeTableType',
                ],
                include: [
                    {
                        model: model.timeTableStructurePeriodsModel,
                        as: 'timeTablecreation',
                        required: false,
                        attributes: [
                            'timeTableCreationId',
                            'periodName',
                            'startTime',
                            'endTime',
                        ],
                    },
                    {
                        model: model.timeTableRoutineModel,
                        as: 'timeTableRoutine',
                        required: true,
                        attributes: [
                            'timeTableRoutineId',
                            'classSectionTermId',
                            'academicGroupId',
                            'courseId',
                            'startingDate',
                            'endingDate',
                        ],
                        include: [
                            timeTableRoutineClassSectionInclude({
                                termAttributes: [
                                    'classSectionTermId',
                                    'term',
                                    'classSectionsId',
                                ],
                                sectionAttributes: [
                                    'classSectionsId',
                                    'year',
                                    'section',
                                ],
                            }),
                            {
                                model: model.academicGroupModel,
                                as: 'academicGroup',
                                required: false,
                                attributes: [
                                    'academicGroupId',
                                    'groupName',
                                    'groupCode',
                                    'academicGroupScopeId',
                                ],
                                include: [
                                    {
                                        model: model.academicGroupScopeModel,
                                        as: 'scope',
                                        required: false,
                                        attributes: [
                                            'academicGroupScopeId',
                                            'courseId',
                                            'sessionId',
                                            'term',
                                            'classSectionTermId',
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    });
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

export async function getDetailsByTerm(classSectionTermId, subjectId, userId) {
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
                where: { userId, deletedAt: null },
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
