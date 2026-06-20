import { Op, Sequelize } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import {
    resolveSubjectIdsForTeacherFilters,
    teacherSubjectWhere,
} from './teacherSubjectMappingRepository.js';

async function assertScopedEmployee(employeeId, options = {}) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction: options.transaction,
    });
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
            { where: { employeeId }, transaction },
        );
        return result;
    } catch (error) {
        console.error("Error in update employee:", error);
        throw error;
    }
};

export async function getAllEmployee(campusId, instituteId) {
    try {
        const whereClause = {
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
                            model: model.userRoleModel.unscoped(),
                            as: 'userRoles',
                            attributes: ["role"],
                        },
                        {
                            model: model.userPermissionModel.unscoped(),
                            as: 'userPermissions',
                            attributes: ["permission"],
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
                            model: model.userRoleModel.unscoped(),
                            as: 'userRoles',
                            attributes: ["role"],
                        },
                        {
                            model: model.userPermissionModel.unscoped(),
                            as: 'userPermissions',
                            attributes: ["permission"],
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
                            model: model.userRoleModel.unscoped(),
                            as: 'userRoles',
                            attributes: ["role"],
                        },
                        {
                            model: model.userPermissionModel.unscoped(),
                            as: 'userPermissions',
                            attributes: ["permission"],
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

export async function deleteEmployeeDetail(employeeId) {
    try {
        const existing = await assertScopedEmployee(employeeId);
        if (!existing) {
            throw new Error('Employee not found');
        }

        await scoped(model.employeeModel).destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
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

        const acedmicYearId = filters.acedmicYearId != null ? Number(filters.acedmicYearId) : undefined;
        const sessionId = filters.sessionId != null ? Number(filters.sessionId) : undefined;
        const subjectIds = await resolveSubjectIdsForTeacherFilters({ acedmicYearId, sessionId });

        const subjectWhere = {
            ...(acedmicYearId != null && { acedmicYearId }),
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
                            where: { employeeId },
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

export async function getTeacherCourses(employeeId, acedmicYearId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }

        const result = await model.teacherSubjectMappingModel.findAll({
            where: { employeeId },
            include: [
                {
                    model: model.classSubjectMapperModel.unscoped(),
                    as: "employeeSubject",
                    required: true,
                    include: [
                        {
                            model: model.subjectModel.unscoped(),
                            as: "subjects",
                            required: true,
                            where: {
                                acedmicYearId,
                                ...buildScope(model.subjectModel),
                            },
                            include: [
                                {
                                    model: model.courseModel.unscoped(),
                                    as: "courseInfo",
                                    required: true,
                                    attributes: ["courseId", "courseName", "courseCode"],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const courses = [];
        const seen = new Set();

        result.forEach(mapping => {
            const course = mapping.employeeSubject?.subjects?.courseInfo;
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

export async function getTeacherSubjectsFromSchedule(employeeId, acedmicYearId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return { courses: [], subjects: [] };
        }

        const routineWhere = {
            ...(acedmicYearId && { acedmicYearId }),
            ...buildScope(model.timeTableRoutineModel),
        };

        const result = await model.classScheduleModel.findAll({
            where: {
                [Op.or]: [
                    { employeeId },
                    Sequelize.literal(`
                      EXISTS (
                        SELECT 1
                        FROM teacher_subject_mapping tsm
                        WHERE tsm.teacher_subject_mapping_id = class_schedule_item.teacher_subject_mapping_id
                        AND tsm.employee_id = ${employeeId}
                      )
                    `),
                ],
            },
            include: [
                {
                    model: model.timeTableRoutineModel.unscoped(),
                    as: "timeTablecreate",
                    required: true,
                    where: routineWhere,
                },
                {
                    model: model.subjectModel.unscoped(),
                    as: "timeTableSubject",
                    required: false,
                    include: [
                        {
                            model: model.courseModel.unscoped(),
                            as: "courseInfo",
                            attributes: ["courseId", "courseName", "courseCode"],
                        },
                    ],
                },
                {
                    model: model.electiveSubjectModel.unscoped(),
                    as: "timeTableElective",
                    required: false,
                },
                {
                    model: model.teacherSubjectMappingModel.unscoped(),
                    as: "timeTableTeacherSubject",
                    required: false,
                    include: [
                        {
                            model: model.classSubjectMapperModel.unscoped(),
                            as: 'employeeSubject',
                            include: [
                                {
                                    model: model.subjectModel.unscoped(),
                                    as: "subjects",
                                    include: [
                                        {
                                            model: model.courseModel.unscoped(),
                                            as: "courseInfo",
                                            attributes: ["courseId", "courseName", "courseCode"],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const coursesMap = new Map();
        const subjectsMap = new Map();

        result.forEach(item => {
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
            } else if (item.timeTableTeacherSubject?.employeeSubject?.subjects) {
                const sub = item.timeTableTeacherSubject.employeeSubject.subjects;
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
        });

        return {
            courses: Array.from(coursesMap.values()),
            subjects: Array.from(subjectsMap.values())
        };
    } catch (error) {
        console.error("Error in getTeacherSubjectsFromSchedule repository:", error);
        throw error;
    }
}