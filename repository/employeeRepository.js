import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import {
    resolveSubjectIdsForTeacherFilters,
    teacherSubjectWhere,
} from './teacherSubjectMappingRepository.js';

async function assertScopedEmployee(employeeId, options = {}) {
    return scoped(model.employeeModel).findOne({
        where: { userId: employeeId },
        attributes: ['userId', 'employeeId'],
        transaction: options.transaction,
    });
}

export async function resolveEmployeeIdForAuth({ userId, employeeId } = {}) {
    if (employeeId != null && employeeId !== '') {
        const row = await scoped(model.employeeModel).findOne({
            where: { userId: Number(employeeId) },
            attributes: ['userId'],
        });
        if (!row) {
            return null;
        }
        if (userId != null && Number(row.userId) !== Number(userId)) {
            return null;
        }
        return row.userId;
    }

    if (userId != null && userId !== '') {
        const row = await scoped(model.employeeModel).findOne({
            where: { userId: Number(userId) },
            attributes: ['employeeId'],
        });
        return row?.employeeId ?? null;
    }

    return null;
}

export async function addEmployee(data, transaction) {
    try {
        const result = await scoped(model.employeeModel).create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add employee :", error);
        throw error;
    }
};

export async function updateEmployee(employeeId, data, transaction) {
    try {
        const existing = await assertScopedEmployee(employeeId, { transaction });
        if (!existing) {
            return [0];
        }

        const result = await scoped(model.employeeModel).update(
            data,
            { where: { userId: employeeId }, transaction },
        );
        return result;
    } catch (error) {
        console.error("Error in update employee:", error);
        throw error;
    }
};

export async function getAllEmployee(campusId, instituteId, options = {}) {
    try {
        const { employeeId } = options;
        const whereClause = {
            ...(employeeId && { userId: employeeId }),
            ...(campusId && { campusId }),
            ...(instituteId && { instituteId }),
        };
        return await scoped(model.employeeModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: whereClause,
            include: [
                {
                    model: model.userModel.unscoped(),
                    as: 'userEmployee',
                    attributes: ["universityId", "userId"],
                },
                {
                    model: model.userModel.unscoped(),
                    as: 'user',
                    attributes: ["universityId", "userId"],
                    required: false,
                    include: [
                        {
                            model: model.userRolePermissionModel.unscoped(),
                            as: 'userRolePermissions',
                            attributes: ["roleId", "permission", "scope"],
                            include: [
                                {
                                    model: model.roleModel.unscoped(),
                                    as: 'userRole',
                                    attributes: ["role"],
                                }
                            ]
                        },
                    ],
                },
                {
                    model: model.employeeOfficeModel.unscoped(),
                    as: 'office',
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: model.employeeMetaDataModel.unscoped(),
                    as: "employeeMetaData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "typess",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.departmentModel.unscoped(),
                    as: 'employeeDepartment',
                    attributes: ['departmentId', 'departmentName'],
                    required: false,
                },
            ],
        });
    } catch (error) {
        console.error(`Error in getting all employee :`, error);
        throw error;
    };
};

export async function getSingleEmployeeDetails(employeeId) {
    try {
        const result = await scoped(model.employeeModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel.unscoped(),
                    as: 'userEmployee',
                    attributes: ["universityId", "userId"],
                    include: [
                        {
                            model: model.userRolePermissionModel.unscoped(),
                            as: 'userRolePermissions',
                            attributes: ["roleId", "permission", "scope"],
                            include: [
                                {
                                    model: model.roleModel.unscoped(),
                                    as: 'userRole',
                                    attributes: ["role"],
                                }
                            ]
                        },
                    ],
                },
                {
                    model: model.userModel.unscoped(),
                    as: 'user',
                    attributes: ["universityId", "userId", "email"],
                    required: false,
                    include: [
                        {
                            model: model.userRolePermissionModel.unscoped(),
                            as: 'userRolePermissions',
                            attributes: ["roleId", "permission", "scope"],
                            include: [
                                {
                                    model: model.roleModel.unscoped(),
                                    as: 'userRole',
                                    attributes: ["role"],
                                }
                            ]
                        },
                    ],
                },


                {
                    model: model.employeeAddressModel.unscoped(),
                    as: 'address',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.employeeCorAddressModel.unscoped(),
                    as: 'CorsAddress',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    // include:[
                    //     {
                    //         model: model.employeeCodeMasterType,
                    //         as: "codeMasterCountry",
                    //         attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                    //         include :[
                    //             {
                    //                 model: model.employeeCodeMaster,
                    //                 as: "codes",
                    //                 attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    //             },
                    //         ]
                    //     },
                    //     {
                    //         model: model.employeeCodeMasterType,
                    //         as: "codeMasterState",
                    //         attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                    //         include :[
                    //             {
                    //                 model: model.employeeCodeMaster,
                    //                 as: "codes",
                    //                 attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    //             },
                    //         ]
                    //     },
                    //     {
                    //         model: model.employeeCodeMasterType,
                    //         as: "codeMasterCity",
                    //         attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                    //         include :[
                    //             {
                    //                 model: model.employeeCodeMaster,
                    //                 as: "codes",
                    //                 attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    //             },
                    //         ]
                    //     },
                    // ]
                },
                {
                    model: model.employeeOfficeModel.unscoped(),
                    as: 'office',
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: model.emplopeeRoleModel.unscoped(),
                    as: 'role',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.employeeSkillModel.unscoped(),
                    as: 'skill',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterEmployeeSkill",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                },
                {
                    model: model.employeeDocumentsModel.unscoped(),
                    as: 'qualification',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterDocumentQualification",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterDocumentDegreeLevel",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterDocumentStream",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                },
                {
                    model: model.employeeQualificationModel.unscoped(),
                    as: 'documents',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterQualificationDocuments",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                },
                {
                    model: model.employeeExperianceModel.unscoped(),
                    as: 'experiance',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterExperienceType",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                },
                {
                    model: model.employeeAchievementModel.unscoped(),
                    as: 'achievements',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterAchievementCategory",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                },
                {
                    model: model.employeeWardModel.unscoped(),
                    as: 'ward',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.employeeActivityModel.unscoped(),
                    as: 'activty',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.employeeReferenceModel.unscoped(),
                    as: 'reference',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.employeeResearchModel.unscoped(),
                    as: 'research',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.employeeFilesModel.unscoped(),
                    as: 'files',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "employeeId"] },
                },
                {
                    model: model.employeeLongLeaveModel.unscoped(),
                    as: 'longLeave',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterLeaveType",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                },
                {
                    model: model.employeeMetaDataModel.unscoped(),
                    as: "employeeMetaData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "typess",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                    ]
                },
                {
                    model: model.departmentModel.unscoped(),
                    as: 'employeeDepartment',
                    attributes: ['departmentId', 'departmentName'],
                    required: false,
                },
            ],
            where: {
                employeeId: employeeId
            },
        });
        return result;
    } catch (error) {
        console.error(`Error in getting employee for ${employeeId} :`, error);
        throw error;
    };
};

async function assertEmployeeNotLinked(employeeId) {
    const subjectLinks = await scoped(model.teacherSubjectMappingModel).count({
        where: { employeeId },
    });

    if (subjectLinks > 0) {
        const error = new Error('Cannot delete employee: employee is connected to subjects.');
        error.statusCode = 409;
        throw error;
    }
}

export async function deleteEmployeeDetail(employeeId) {
    try {
        const existing = await assertScopedEmployee(employeeId);
        if (!existing) {
            throw new Error('Employee not found');
        }

        await assertEmployeeNotLinked(employeeId);

        await scoped(model.employeeModel).destroy({
            where: { userId: employeeId },
            individualHooks: true,
        });
        return { message: 'employee deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        if (error.statusCode === 409 || error.message === 'Employee not found') {
            throw error;
        }
        throw new Error('Unable to soft delete account');
    }
};


export async function createEmployeeWithDetails(employeeData, officeData, addressData, transaction) {
    const employee = await scoped(model.employeeModel).create(employeeData, { transaction });

    if (officeData) {
        officeData.employeeId = employee.employeeId;
        await model.employeeOfficeModel.create(officeData, { transaction });
    }

    if (addressData) {
        addressData.employeeId = employee.employeeId;
        await model.employeeAddressModel.create(addressData, { transaction });
    }

    return employee;
};

export async function getPreviousEnrollNumber(instituteCode) {
    try {
        const attribute = ["employee_Code"];
        const result = await scoped(model.employeeModel).findOne({
            attributes: attribute,
            where: {
                employee_Code: {
                    [Op.regexp]: `^${instituteCode}(/|$)`
                }
            },
            order: [['employee_Code', 'DESC']]
        });
        return result;
    } catch (error) {
        console.error(`Error in get Previous Enroll Number for institue Code ${instituteCode}:`, error);
        throw error;
    }
};

export async function getTeacherSubject(employeeId, filters = {}) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }

        const { academicYearId, sessionId, term } = filters;
        const subjectIds = await resolveSubjectIdsForTeacherFilters({ academicYearId, sessionId });

        const subjectWhere = {
            ...(academicYearId != null && { academicYearId }),
            ...(term != null && { term }),
            ...buildScope(model.subjectModel),
        };

        return scoped(model.teacherSubjectMappingModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            where: {
                employeeId,
                ...teacherSubjectWhere(subjectIds),
            },
            include: [
                {
                    model: model.subjectModel,
                    as: 'employeeSubject',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    where: subjectWhere,
                    required: true,
                    include: [
                        {
                            model: model.courseModel,
                            as: 'courseInfo',
                            attributes: ['courseId', 'courseName', 'courseCode'],
                            required: false,
                        },
                        {
                            model: model.internalAssessmentModel,
                            as: 'subjectAssessments',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                            where: {
                                employeeId,
                                ...(term != null && { term }),
                            },
                            required: false,
                            include: [
                                {
                                    model: model.examSetupTypeModel,
                                    as: 'assessmentExamType',
                                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                                    required: false,
                                    include: [
                                        {
                                            model: model.examStructureModel,
                                            as: 'examStructure',
                                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
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
        console.error('Error in getting employee subjects:', error);
        throw error;
    }
};

export async function getTeacherCourses(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }

        const result = await scoped(model.teacherSubjectMappingModel).findAll({
            where: { employeeId: Number(employeeId) },
            include: [
                {
                    model: model.subjectModel.unscoped(),
                    as: 'employeeSubject',
                    required: true,
                    where: buildScope(model.subjectModel),
                    include: [
                        {
                            model: model.courseModel.unscoped(),
                            as: 'courseInfo',
                            required: true,
                            attributes: ['courseId', 'courseName', 'courseCode'],
                        },
                    ],
                },
            ],
        });

        const courses = [];
        const seen = new Set();

        result.forEach((mapping) => {
            const course = mapping.employeeSubject?.courseInfo;
            if (course && !seen.has(course.courseId)) {
                courses.push(course);
                seen.add(course.courseId);
            }
        });

        return courses;
    } catch (error) {
        console.error("Error in getTeacherCourses repository:", error);
        throw error;
    }
};

export async function getTeacherSubjectsFromSchedule(userId) {
    try {
        const employee = await assertScopedEmployee(userId);
        if (!employee) {
            return { courses: [], subjects: [] };
        }

        const teacherUserId = Number(employee.userId);

        const result = await model.timeTableCellModel.findAll({
            attributes: [
                'timeTableCellId',
                'subjectId',
                'electiveSubjectId',
                'teacherSubjectMappingId',
            ],
            where: {
                [Op.or]: [
                    { '$timeTableCellTeachers.user_id$': teacherUserId },
                    { '$timeTableTeacherSubject.user_id$': teacherUserId },
                ],
            },
            subQuery: false,
            include: [
                {
                    model: model.timeTableCellTeachersModel,
                    as: 'timeTableCellTeachers',
                    required: false,
                    attributes: ['userId'],
                },
                {
                    model: model.timeTableRoutineModel,
                    as: 'timeTableRoutine',
                    required: true,
                    where: buildScope(model.timeTableRoutineModel),
                    attributes: ['timeTableRoutineId'],
                },
                {
                    model: model.subjectModel,
                    as: 'timeTableSubject',
                    required: false,
                    where: buildScope(model.subjectModel),
                    attributes: ['subjectId', 'subjectName', 'subjectCode'],
                    include: [
                        {
                            model: model.courseModel,
                            as: 'courseInfo',
                            attributes: ['courseId', 'courseName', 'courseCode'],
                            required: false,
                        },
                    ],
                },
                {
                    model: model.electiveSubjectModel,
                    as: 'timeTableElective',
                    required: false,
                    attributes: [
                        'electiveSubjectId',
                        'electiveSubjectName',
                        'electiveSubjectCode',
                    ],
                },
                {
                    model: model.teacherSubjectMappingModel,
                    as: 'timeTableTeacherSubject',
                    required: false,
                    attributes: ['teacherSubjectMappingId', 'userId'],
                    include: [
                        {
                            model: model.subjectModel,
                            as: 'employeeSubject',
                            where: buildScope(model.subjectModel),
                            required: false,
                            attributes: ['subjectId', 'subjectName', 'subjectCode'],
                            include: [
                                {
                                    model: model.courseModel,
                                    as: 'courseInfo',
                                    attributes: ['courseId', 'courseName', 'courseCode'],
                                    required: false,
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const coursesMap = new Map();
        const subjectsMap = new Map();

        for (const row of result) {
            const item = row.get({ plain: true });
            let subject = null;
            let course = null;

            if (item.timeTableSubject) {
                subject = {
                    subjectId: item.timeTableSubject.subjectId,
                    subjectName: item.timeTableSubject.subjectName,
                    subjectCode: item.timeTableSubject.subjectCode,
                };
                course = item.timeTableSubject.courseInfo;
            } else if (item.timeTableElective) {
                subject = {
                    subjectId: item.timeTableElective.electiveSubjectId,
                    subjectName: item.timeTableElective.electiveSubjectName,
                    subjectCode: item.timeTableElective.electiveSubjectCode,
                };
            } else if (item.timeTableTeacherSubject && item.timeTableTeacherSubject.employeeSubject) {
                const sub = item.timeTableTeacherSubject.employeeSubject;
                subject = {
                    subjectId: sub.subjectId,
                    subjectName: sub.subjectName,
                    subjectCode: sub.subjectCode,
                };
                course = sub.courseInfo;
            }

            if (subject && !subjectsMap.has(subject.subjectId)) {
                subjectsMap.set(subject.subjectId, subject);
            }

            if (course && !coursesMap.has(course.courseId)) {
                coursesMap.set(course.courseId, course);
            }
        }

        const courses = [];
        for (const course of coursesMap.values()) {
            courses.push(course);
        }
        const subjects = [];
        for (const subject of subjectsMap.values()) {
            subjects.push(subject);
        }

        return { courses, subjects };
    } catch (error) {
        console.error('Error in getTeacherSubjectsFromSchedule repository:', error);
        throw error;
    }
}