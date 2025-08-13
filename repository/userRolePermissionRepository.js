import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addUserRolePermission(UserRolePermissionData) {
    try {
        const result = await model.userRolePermissionModel.create(UserRolePermissionData);
        return result;
    } catch (error) {
        console.error("Error in add UserRolePermission :", error);
        throw error;
    }
};

export async function getUserRolePermissionDetails(universityId) {
    try {
        const UserRolePermission = await model.userRolePermissionModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id", "permission_id", "user_id"] },
            include: [
                {
                    model: model.userModel,
                    as: 'user',
                    attributes: ["userName", "email", "role", "phone"],
                },
                {
                    model: model.roleModel,
                    as: 'userRole',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.permissionModel,
                    as: 'userPermission',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                }
            ]
        });

        return UserRolePermission;
    } catch (error) {
        console.error('Error fetching UserRolePermission details:', error);
        throw error;
    }
}


export async function getSingleUserRolePermissionDetails(userRolePermissionId) {
    try {
        const UserRolePermission = await model.userRolePermissionModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id", "permission_id", "user_id"] },
            include: [
                {
                    model: model.userModel,
                    as: 'user',
                    attributes: ["userName", "email", "role", "phone"],
                },
                {
                    model: model.roleModel,
                    as: 'userRole',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.permissionModel,
                    as: 'userPermission',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                }
            ], where: { userRolePermissionId },
        });

        return UserRolePermission;
    } catch (error) {
        console.error('Error fetching UserRolePermission details:', error);
        throw error;
    }
}

export async function deleteUserRolePermission(userRolePermissionId) {
    const deleted = await model.userRolePermissionModel.destroy({ where: { userRolePermissionId: userRolePermissionId } });
    return deleted > 0;
}

export async function updateUserRolePermission(userRolePermissionId, UserRolePermissionData) {
    try {
        const result = await model.userRolePermissionModel.update(UserRolePermissionData, {
            where: { userRolePermissionId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating UserRolePermission creation ${userRolePermissionId}:`, error);
        throw error;
    }
}

export async function getUserRolePermissionByUserId(userId) {
    try {
        const excludeTimestamps = ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];
        const excludeUserRolePermission = [...excludeTimestamps, "role_id", "permission_id", "user_id"];
        const excludeFeeInvoice = [...excludeTimestamps, "fee_group_id", "class_student_mapper_id", "class_sections_id"];
        const excludeFeeInvoiceDetail = [...excludeTimestamps, "fee_type_id", "fee_invoice_id"];
        const excludeAttendance = [...excludeTimestamps, "student_id", "class_sections_id"];

        const UserRolePermission = await model.userModel.findOne({
            distinct: true,
            attributes: ["userId"],
            where: { userId },
            include: [
                {
                    model: model.userRolePermissionModel,
                    as: 'user',
                    distinct: true,
                    attributes: { exclude: excludeUserRolePermission },
                    include: [
                        {
                            model: model.roleModel,
                            as: 'userRole',
                            distinct: true,
                            attributes: { exclude: excludeTimestamps },
                        },
                        {
                            model: model.permissionModel,
                            as: 'userPermission',
                            distinct: true,
                            attributes: { exclude: excludeTimestamps },
                        },
                    ]
                },
                {
                    model: model.userStudentEmployeeModel,
                    as: 'userDetails',
                    distinct: true,
                    attributes: ["employeeId", "studentId"],
                    include: [
                        {
                            model: model.studentModel,
                            as: 'studentDetails',
                            distinct: true,
                            attributes: ["firstName", "middleName", "lastName", "campusId", "instituteId", "affiliatedUniversityId", "courseLevelId", "courseId", "specializationId"],
                            include: [
                                {
                                    model: model.courseModel,
                                    as: 'course',
                                    distinct: true,
                                    attributes: ["courseName", 'courseId', 'courseCode', "capacity"],
                                },
                                {
                                    model: model.studentInvoiceMapperModel,
                                    as: 'invoicestudent',
                                    attributes: { exclude: excludeTimestamps }
                                },
                                {
                                    model: model.classStudentMapperModel,
                                    as: 'studentMapped',
                                    distinct: true,
                                    // attributes: ["classStudentMapperId", 'studentId'],
                                    attributes: { exclude: excludeTimestamps },
                                },
                                {
                                    model: model.classSectionModel,
                                    as: 'studentSections',
                                    distinct: true,
                                    // attributes: [ "classSectionsId", 'courseId', 'specializationId','acedmicYearId', 'section'],
                                    attributes: { exclude: excludeTimestamps },
                                    include: [
                                        {
                                            model: model.teacherSectionMappingModel,
                                            as: "employeeSection",
                                            distinct: true,
                                            // attributes: ["employeeId", 'classSectionsId', 'isCordinatory'],
                                            attributes: { exclude: excludeTimestamps },
                                            include: [
                                                {
                                                    model: model.employeeModel,
                                                    as: 'employeeData',
                                                    distinct: true,
                                                    attributes: { exclude: excludeTimestamps },
                                                }
                                            ]
                                        },
                                        {
                                            model: model.semesterModel,
                                            as: 'semester',
                                            distinct: true,
                                            attributes: { exclude: excludeTimestamps },
                                            include: [
                                                {
                                                    model: model.classSubjectMapperModel,
                                                    as: 'semestermapping',
                                                    distinct: true,
                                                    attributes: { exclude: excludeTimestamps },
                                                    include: [
                                                        {
                                                            model: model.subjectModel,
                                                            as: "subjects",
                                                            distinct: true,
                                                            // attributes: ["subjectName", 'subjectId', 'courseId', 'specializationId'],
                                                            attributes: { exclude: excludeTimestamps },
                                                        },
                                                        {
                                                            model: model.teacherSubjectMappingModel,
                                                            as: "employeeSubject",
                                                            // distinct: true,
                                                            // attributes: ["teacherSubjectMappingId", 'employeeId', 'classSubjectMapperId'],
                                                            attributes: { exclude: excludeTimestamps },
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    model: model.attendanceModel,
                                    as: 'studentAttendance',
                                    distinct: true,
                                    attributes: { exclude: excludeTimestamps },
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        return UserRolePermission;
    } catch (error) {
        console.error('Error fetching UserRolePermission details:', error);
        throw error;
    }
};

export async function getEmployeeRolePermissionByUserId(userId) {
    try {
        const UserRolePermission = await model.userStudentEmployeeModel.findAll({
            attributes: ["userId"],
            include: [
                {
                    model: model.employeeModel,
                    as: 'employeeDetails',
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.roleModel,
                            as: 'employeeRole',
                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] }
                        },
                        {
                            model: model.instituteModel,
                            as: 'employeeInstitute',
                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] }
                        },
                        {
                            model: model.teacherSubjectMappingModel,
                            as: 'teacherEmployeeData',
                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                            include: [
                                {
                                    model: model.classSubjectMapperModel,
                                    as: 'employeeSubject',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                    include: [
                                        {
                                            model: model.semesterModel,
                                            as: 'semestermapping',
                                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                        },
                                        {
                                            model: model.subjectModel,
                                            as: 'subjects',
                                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                            include: [
                                                {
                                                    model: model.courseModel,
                                                    as: 'courseInfo',
                                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: model.teacherSectionMappingModel,
                            as: 'employeeData',
                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                            include: [
                                {
                                    model: model.classSectionModel,
                                    as: 'employeeSection',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                    include: [
                                        {
                                            model: model.studentModel,
                                            as: 'studentSections',
                                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: model.timeTableMappingModel,
                            as: 'timeTableMappings',
                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                            include: [
                                {
                                    model: model.timeTableCreateModel,
                                    as: 'timeTablecreate',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                },
                                {
                                    model: model.classRoomModel,
                                    as: 'classRoom',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                },
                                {
                                    model: model.timeTableCreationModel,
                                    as: 'timeTablecreation',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                },
                                {
                                    model: model.electiveSubjectModel,
                                    as: 'timeTableElective',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                },
                                {
                                    model: model.electiveSubjectModel,
                                    as: 'timeTableElective',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                },
                                {
                                    model: model.subjectModel,
                                    as: 'timeTableSubject',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                }
                            ]
                        }
                    ]
                },
                {
                    model: model.userModel,
                    as: 'userDetails',
                    attributes: ["userId"],
                    include: [
                        {
                            model: model.userRolePermissionModel,
                            as: 'user',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id", "permission_id", "user_id"] },
                            include: [
                                {
                                    model: model.roleModel,
                                    as: 'userRole',
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                                {
                                    model: model.permissionModel,
                                    as: 'userPermission',
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                }
            ],
            where: { userId },
        });

        return UserRolePermission;
    } catch (error) {
        console.error('Error fetching Employee Role Permission details:', error);
        throw error;
    }
};
// getEmployeeRolePermissionByUserId(15)