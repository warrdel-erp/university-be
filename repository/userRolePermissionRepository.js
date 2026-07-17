import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addUserRolePermission(UserRolePermissionData) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId: UserRolePermissionData.userId },
    });
    if (!user) {
      throw new Error("User not found");
    }

    return scoped(model.userRolePermissionModel).create(UserRolePermissionData);
  } catch (error) {
    console.error("Error in add UserRolePermission :", error);
    throw error;
  }
}

export async function getUserRolePermissionDetails() {
  try {
    return scoped(model.userRolePermissionModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id", "permission_id", "user_id"] },
      include: [
        {
          model: model.userModel,
          as: "user",
          attributes: ["userName", "email", "role", "phone"],
          where: buildScope(model.userModel),
          required: true,
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
  } catch (error) {
    console.error("Error fetching UserRolePermission details:", error);
    throw error;
  }
}

export async function getSingleUserRolePermissionDetails(userRolePermissionId) {
  try {
    return scoped(model.userRolePermissionModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id", "permission_id", "user_id"] },
      include: [
        {
          model: model.userModel,
          as: "user",
          attributes: ["userName", "email", "role", "phone"],
          where: buildScope(model.userModel),
          required: true,
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
    } catch (error) {
        console.error('Error fetching UserRolePermission details:', error);
        throw error;
    }
}

export async function deleteUserRolePermission(userRolePermissionId) {
  const existing = await scoped(model.userRolePermissionModel).findOne({
    attributes: ["userRolePermissionId"],
    where: { userRolePermissionId },
    include: [
      {
        model: model.userModel,
        as: "user",
        attributes: ["userId"],
        where: buildScope(model.userModel),
        required: true,
      },
    ],
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.userRolePermissionModel).destroy({
    where: { userRolePermissionId },
  });
  return deleted > 0;
}

export async function updateUserRolePermission(userRolePermissionId, UserRolePermissionData) {
  try {
    const existing = await scoped(model.userRolePermissionModel).findOne({
      attributes: ["userRolePermissionId"],
      where: { userRolePermissionId },
      include: [
        {
          model: model.userModel,
          as: "user",
          attributes: ["userId"],
          where: buildScope(model.userModel),
          required: true,
        },
      ],
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.userRolePermissionModel).update(UserRolePermissionData, {
      where: { userRolePermissionId },
    });
  } catch (error) {
    console.error(`Error updating UserRolePermission creation ${userRolePermissionId}:`, error);
    throw error;
  }
}

export async function getUserRolePermissionByUserId(userId) {
  try {
    return scoped(model.userModel).findOne({
            distinct: true,
            attributes: ["userId"],
            where: { userId },
            include: [
                {
                    model: model.userRolePermissionModel,
                    as: 'user',
                    distinct: true,
                    attributes: ["permissionId"],
                    include: [
                        // {
                        //     model: model.roleModel,
                        //     as: 'userRole',
                        //     distinct: true,
                        //     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        // },
                        // {
                        //     model: model.permissionModel,
                        //     as: 'userPermission',
                        //     distinct: true,
                        //     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        // },
                    ]
                },
                {
                    model: model.userStudentEmployeeModel,
                    as: 'userDetails',
                    distinct: true,
                    attributes: ["userId", "studentId"],
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
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
                                },
                                {
                                    model: model.classStudentMapperModel,
                                    as: 'studentMapped',
                                    distinct: true,
                                    // attributes: ["classStudentMapperId", 'studentId'],
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                                {
                                    model: model.classSectionTermModel,
                                    as: 'studentClassSectionTerm',
                                    distinct: true,
                                    attributes: ['classSectionTermId', 'term', 'classSectionsId'],
                                    include: [{
                                        model: model.classSectionModel,
                                        as: 'classSection',
                                        distinct: true,
                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                        include: [
                                            {
                                                model: model.teacherSectionMappingModel,
                                                as: "employeeSection",
                                                distinct: true,
                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                include: [
                                                    {
                                                        model: model.employeeModel,
                                                        as: 'employeeData',
                                                        distinct: true,
                                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                    }
                                                ]
                                            },
                                            {
                                                model: model.semesterModel,
                                                as: 'semester',
                                                distinct: true,
                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                include: [
                                                    {
                                                        model: model.classSubjectMapperModel,
                                                        as: 'semestermapping',
                                                        distinct: true,
                                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                        include: [
                                                            {
                                                                model: model.subjectModel,
                                                                as: "subjects",
                                                                distinct: true,
                                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                            },
                                                            {
                                                                model: model.teacherSubjectMappingModel,
                                                                as: "employeeSubject",
                                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ],
                                    }],
                                }
                            ]
                        }
                        // {
                        //     model: model.studentModel,
                        //     as: 'studentDetails',
                        //     distinct: true,
                        //     attributes: ["firstName", "middleName", "lastName", "campusId", "instituteId", "affiliatedUniversityId", "courseLevelId", "courseId", "specializationId"],
                        //     include: [
                        //         {
                        //             model: model.courseModel,
                        //             as: 'course',
                        //             distinct: true,
                        //             attributes: ["courseName", 'courseId', 'courseCode', "capacity"],
                        //         },
                        //         {
                        //             model: model.studentInvoiceMapperModel,
                        //             as: 'invoicestudent',
                        //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
                        //         },
                        //         {
                        //             model: model.classStudentMapperModel,
                        //             as: 'studentMapped',
                        //             distinct: true,
                        //             // attributes: ["classStudentMapperId", 'studentId'],
                        //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //         },
                        //         {
                        //             model: model.classSectionModel,
                        //             as: 'studentSections',
                        //             distinct: true,
                        //             // attributes: [ "classSectionsId", 'courseId', 'specializationId','academicYearId', 'section'],
                        //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //             include: [
                        //                 {
                        //                     model: model.teacherSectionMappingModel,
                        //                     as: "employeeSection",
                        //                     distinct: true,
                        //                     // attributes: ["userId", 'classSectionsId', 'isCordinatory'],
                        //                     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //                     include: [
                        //                         {
                        //                             model: model.employeeModel,
                        //                             as: 'employeeData',
                        //                             distinct: true,
                        //                             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //                         }
                        //                     ]
                        //                 },
                        //                 {
                        //                     model: model.semesterModel,
                        //                     as: 'semester',
                        //                     distinct: true,
                        //                     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //                     include: [
                        //                         {
                        //                             model: model.classSubjectMapperModel,
                        //                             as: 'semestermapping',
                        //                             distinct: true,
                        //                             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //                             include: [
                        //                                 {
                        //                                     model: model.subjectModel,
                        //                                     as: "subjects",
                        //                                     distinct: true,
                        //                                     // attributes: ["subjectName", 'subjectId', 'courseId', 'specializationId'],
                        //                                     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //                                 },
                        //                                 {
                        //                                     model: model.teacherSubjectMappingModel,
                        //                                     as: "employeeSubject",
                        //                                     // distinct: true,
                        //                                     // attributes: ["teacherSubjectMappingId", 'userId', 'classSubjectMapperId'],
                        //                                     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        //                                 }
                        //                             ]
                        //                         }
                        //                     ]
                        //                 }
                        //             ]
                        //         }
                        //     ]
                        // }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error('Error fetching UserRolePermission details:', error);
        throw error;
    }
};

export async function getEmployeeRolePermissionByUserId(userId) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
    });
    if (!user) {
      return [];
    }

    return scoped(model.userStudentEmployeeModel).findAll({
            attributes: ["userId"],
            limit: 1,
            include: [
                {
                    model: model.employeeModel,
                    as: 'employeeDetails',
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: buildScope(model.employeeModel),
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
                                }
                            ]
                        },
                        {
                            model: model.classScheduleModel,
                            as: 'timeTableMappings',
                            attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                            include: [
                                {
                                    model: model.timeTableRoutineModel,
                                    as: 'timeTablecreate',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                },
                                {
                                    model: model.classRoomModel,
                                    as: 'classRoom',
                                    attributes: { exclude: ["createdAt", 'updatedAt', 'deletedAt'] },
                                },
                                {
                                    model: model.timeTableStructurePeriodsModel,
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
    } catch (error) {
        console.error('Error fetching Employee Role Permission details:', error);
        throw error;
    }
};