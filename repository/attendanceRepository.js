import { Op, fn, col, where } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from '../models/index.js'
import moment from "moment";

export async function addAttendance(attendanceRecords) {
    try {
        const result = await model.attendanceModel.bulkCreate(attendanceRecords);
        return result;
    } catch (error) {
        console.error("Error in adding attendance:", error);
        throw error;
    }
};

export async function getAttendanceDetails(universityId, acedmicYearId, role, instituteId) {
    const whereClause = {
        ...(universityId && { universityId }),
        ...(acedmicYearId && { acedmicYearId }),
        ...(role === 'Head' && { instituteId })
    }
    try {
        const attendanceDetails = await model.attendanceModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "class_sections_id", "student_id"] },
            // where:whereClause,
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
                    // where :whereClause,
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
                            attributes: ["employeeId", "campusId", "instituteId", "employeeCode", "employeeName"]
                        },
                        {
                            model: model.electiveSubjectModel,
                            as: 'timeTableElective',
                            attributes: ["electiveSubjectName", "electiveSubjectCode"]
                        },
                        {
                            model: model.subjectModel,
                            as: 'timeTableSubject',
                            attributes: ["subjectName", "subjectCode"]
                        },
                        {
                            model: model.timeTableRoutineModel,
                            as: 'timeTablecreate',
                            attributes: ['classSectionsId', 'timeTableType'],
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
                                            attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "deletedAt"] }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        return attendanceDetails;
    } catch (error) {
        console.error('Error fetching attendance details:', error);
        throw error;
    }
};

export async function updateAttendance(attendanceId, record) {
    try {
        const result = await model.attendanceModel.update(record, {
            where: { attendanceId },
        });
        return result;
    } catch (error) {
        console.error(`Error updating attendance ${attendanceId}:`, error);
        throw error;
    }
};

export async function addImportAttendance(attendanceRecords) {
    try {
        const result = await model.attendanceModel.create(attendanceRecords);
        return result;
    } catch (error) {
        console.error("Error in adding attendance bulk import:", error);
        throw error;
    }
};


export async function getAttendanceByDate(date, classSectionsId, employeeId) {

    try {
        const attendanceDetails = await model.attendanceModel.findAll({
            attributes: {
                exclude: [
                    "createdAt",
                    "updatedAt",
                    "deletedAt",
                    "createdBy",
                    "updatedBy",
                    "class_sections_id",
                    "studentId"
                ]
            },
            where: {
                classSectionsId,
                date: { [Op.eq]: fn("DATE", date) }
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
                            "session_id"
                        ]
                    },
                    include: [
                        {
                            model: model.courseModel,
                            as: "courseSection"
                        }
                    ]
                },
                {
                    model: model.studentModel,
                    as: "studentAttendance",
                    attributes: [
                        "firstName",
                        "middleName",
                        "lastName",
                        "scholarNumber",
                        "enrollNumber"
                    ]
                }
            ]
        });

        const subjectDetail = await model.teacherSubjectMappingModel.findOne({
            attributes: {
                exclude: [
                    "createdAt",
                    "updatedAt",
                    "deletedAt",
                    "createdBy",
                    "updatedBy"
                ]
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
                            "updatedBy"
                        ]
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
                                    "updatedBy"
                                ]
                            },
                        }
                    ]
                }
            ]
        });

        return {
            attendanceDetails: attendanceDetails,
            subjectDetail: subjectDetail
        };

    } catch (error) {
        console.error("Error fetching attendance:", error);
        throw error;
    }
};

export async function getTimetable(timeTableRoutineId) {
    return await model.timeTableRoutineModel.findOne({
        where: {
            timeTableRoutineId,
            deletedAt: null
        },
        attributes: [
            "timeTableRoutineId",
            "startingDate",
            "endingDate"
        ],
        include: [
            {
                model: model.timeTableStructurePeriodsModel,
                as: "timeTablecreation",
                attributes: ["weekOff"],
                required: true
            }
        ]
    });
}

// export async function getAttendanceMap(mappingIds, from, to) {
//   const rows = await model.attendanceModel.findAll({
//     attributes: [
//       "timeTableMappingId",
//       "date",
//       [
//         sequelize.fn("COUNT",sequelize.col("student_id")),
//         "presentCount"
//       ]
//     ],
//     where: {
//       timeTableMappingId: mappingIds,
//       date: { [Op.between]: [from, to] },
//       attentenceStatus: "PRESENT"
//     },
//     group: ["timeTableMappingId", "date"]
//   });

//   const map = {};
//   for (const r of rows) {
//     const dateKey = r.date.toISOString().slice(0, 10);
//     const key = `${r.timeTableMappingId}_${dateKey}`;
//     map[key] = Number(r.get("presentCount"));
//   }

//   return map;
// }

export async function getAttendanceMap(mappingIds, from, to) {
    const rows = await model.attendanceModel.findAll({
        attributes: [
            "timeTableMappingId",
            "date",
            [sequelize.fn("COUNT", sequelize.col("student_id")), "presentCount"]
        ],
        where: {
            timeTableMappingId: mappingIds,
            date: { [Op.between]: [from, to] },
            attentenceStatus: "Present"
        },
        group: ["timeTableMappingId", "date"]
    });

    const map = {};
    for (const r of rows) {
        const dateKey = moment(r.date).format("YYYY-MM-DD");
        const key = `${r.timeTableMappingId}_${dateKey}`;
        map[key] = Number(r.get("presentCount"));
    }

    return map;
}

export async function getStudentCount(classSectionsId) {
    return await model.studentModel.count({
        where: {
            classSectionsId: classSectionsId,
            deletedAt: null
        }
    });
};

export async function getTeacherMappings(employeeId) {
    return await model.classScheduleModel.findAll({
        where: {
            [Op.or]: [
                { employeeId },
                { "$timeTableTeacherSubject.employee_id$": employeeId }
            ]
        },
        include: [
            {
                model: model.teacherSubjectMappingModel,
                as: "timeTableTeacherSubject",
                required: false
            },
            {
                model: model.subjectModel,
                as: "timeTableSubject",
                required: false
            },
            {
                model: model.timeTableRoutineModel,
                as: "timeTablecreate",
                required: true,
                include: [
                    {
                        model: model.classSectionModel,
                        as: "timeTableClassSection",
                        required: false,
                        include: [
                            {
                                model: model.classModel,
                                as: "classGroup",
                                required: false
                            }
                        ]
                    }
                ]
            },
            {
                model: model.timeTableStructurePeriodsModel,
                as: "timeTablecreation",
                required: true
            }
        ]
    });
};