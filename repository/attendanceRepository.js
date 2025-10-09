import { Op, fn, col,where } from "sequelize";
import * as model from '../models/index.js'

export async function addAttendance(attendanceRecords) {      
    try {
        const result = await model.attendanceModel.bulkCreate(attendanceRecords);
        return result;
    } catch (error) {
        console.error("Error in adding attendance:", error);
        throw error;
    }
};

export async function getAttendanceDetails(universityId,acedmicYearId,role,instituteId) {
    const whereClause = {
        ...(universityId && {universityId}),
        ...(acedmicYearId && {acedmicYearId}),
        ...(role === 'Head' && { instituteId })
    }
    try {
        const attendanceDetails = await model.attendanceModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","class_sections_id","student_id"] },
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
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","course_id", "semester_id", "class_id", "acedmic_year_id", "specialization_id", "session_id"] },
                },
                {
                    model: model.studentModel,
                    as: "studentAttendance",
                    // where :whereClause,
                    attributes: ["firstName", "middleName", "lastName","scholarNumber"] ,
                },
                {
                    model:model.timeTableMappingModel,
                    as:'timeTableMapping',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy", "teacher_subject_mapping_id", "time_table_create_id", "time_table_creation_id", "class_room_section_id", "elective_subject_id", "subject_id"] },
                    include:[
                        {
                            model:model.employeeModel,
                            as:'employeeDetails',
                            attributes:["employeeId","campusId","instituteId","employeeCode","employeeName"]
                        },
                        {
                            model:model.electiveSubjectModel,
                            as:'timeTableElective',
                            attributes:["electiveSubjectName","electiveSubjectCode"]
                        },
                        {
                            model:model.subjectModel,
                            as:'timeTableSubject',
                            attributes:["subjectName","subjectCode"]
                        },
                        {
                            model:model.timeTableCreateModel,
                            as:'timeTablecreate',
                            attributes:['classSectionsId','timeTableType'],
                        },
                        {
                            model:model.teacherSubjectMappingModel,
                            as:'timeTableTeacherSubject',
                            attributes:{exclude:["createdAt","updatedAt","createdBy","deletedAt","employee_id","class_subject_mapper_id"]},
                            include:[
                                {
                                    model:model.classSubjectMapperModel,
                                    as:'employeeSubject',
                                    attributes:{exclude:["createdAt","updatedAt","createdBy","deletedAt","semester_id","subject_id"]},
                                    include:[
                                        {
                                            model:model.subjectModel,
                                            as:'subjects',
                                            attributes:{exclude:["createdAt","updatedAt","createdBy","deletedAt"]}
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