import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';
import { ROLES } from '../const/roles.js';

export function teacherSubjectWhere(subjectIds) {
    if (subjectIds == null) {
        return {};
    }
    if (!subjectIds.length) {
        return { subjectId: -1 };
    }
    return { subjectId: { [Op.in]: subjectIds } };
}

async function findEmployeeInInstitute(employeeId) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
    });
}

async function findSubjectInInstitute(subjectId) {
    return scoped(model.subjectModel).findOne({
        attributes: ['subjectId'],
        where: { subjectId },
    });
}

export async function findSubjectIdsForYear(acedmicYearId) {
    const rows = await scoped(model.subjectModel).findAll({
        attributes: ['subjectId'],
        where: { acedmicYearId },
        raw: true,
    });
    return rows.map((row) => row.subjectId);
}

export async function findSubjectIdsForSession(sessionId, acedmicYearId) {
    const mappings = await scoped(model.sessionCouseMappingModel).findAll({
        attributes: ['courseId'],
        where: { sessionId },
        raw: true,
    });
    const courseIds = [...new Set(mappings.map((row) => row.courseId))];
    if (!courseIds.length) {
        return [];
    }

    const where = { courseId: { [Op.in]: courseIds } };
    if (acedmicYearId != null) {
        where.acedmicYearId = acedmicYearId;
    }

    const rows = await scoped(model.subjectModel).findAll({
        attributes: ['subjectId'],
        where,
        raw: true,
    });
    return rows.map((row) => row.subjectId);
}

export async function resolveSubjectIdsForTeacherFilters({ acedmicYearId, sessionId } = {}) {
    let subjectIds = null;

    if (acedmicYearId != null) {
        subjectIds = await findSubjectIdsForYear(acedmicYearId);
    }

    if (sessionId != null) {
        const sessionSubjectIds = await findSubjectIdsForSession(sessionId, acedmicYearId);
        subjectIds = subjectIds != null
            ? subjectIds.filter((id) => sessionSubjectIds.includes(id))
            : sessionSubjectIds;
    }

    return subjectIds;
}

function teacherSubjectRowMatchesSearch(row, search) {
    const term = search.toLowerCase();
    const emp = row.teacherEmployeeData;
    if (emp?.employeeName?.toLowerCase().includes(term)) {
        return true;
    }
    return (row.employeeSubject ?? []).some((sub) =>
        String(sub.term ?? '').includes(term)
        || sub.subjectName?.toLowerCase().includes(term)
        || sub.courseInfo?.courseName?.toLowerCase().includes(term),
    );
}

async function findTeacherSubjectMappingInInstitute(teacherSubjectMappingId) {
    return scoped(model.teacherSubjectMappingModel).findOne({
        where: { teacherSubjectMappingId },
        attributes: ['teacherSubjectMappingId', 'employeeId', 'subjectId'],
        include: [
            {
                model: model.employeeModel,
                as: 'teacherEmployeeData',
                where: buildScope(model.employeeModel),
                required: true,
                attributes: ['employeeId'],
            },
            {
                model: model.subjectModel,
                as: 'employeeSubject',
                where: buildScope(model.subjectModel),
                required: true,
                attributes: ['subjectId'],
            },
        ],
    });
}

export async function teacherSubjectMapping(data) {
    try {
        const employee = await findEmployeeInInstitute(data.employeeId);
        if (!employee) {
            throw new Error(`Employee ID ${data.employeeId} not found`);
        }

        const subject = await findSubjectInInstitute(data.subjectId);
        if (!subject) {
            throw new Error(`Subject ID ${data.subjectId} not found`);
        }

        return await scoped(model.teacherSubjectMappingModel).create(data);
    } catch (error) {
        console.error('Error in teacher Subject Mapping:', error);
        throw error;
    }
}

export async function getTeacherSubjectMapping({
    employeeId,
    subjectId,
    sessionId,
    acedmicYearId = requestContext.getStore()?.academicYearId,
    search,
    page = 1,
    limit = 20,
} = {}) {
    try {
        const subjectIds = acedmicYearId != null || sessionId != null
            ? await resolveSubjectIdsForTeacherFilters({ acedmicYearId, sessionId })
            : null;

        const teacherWhere = {
            ...(employeeId && { employeeId }),
            ...buildScope(model.employeeModel),
        };

        const teachers = await scoped(model.employeeModel).findAll({
            where: teacherWhere,
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            include: [
                {
                    model: model.userModel,
                    as: 'user',
                    attributes: [],
                    required: true,
                    include: [
                        {
                            model: model.userRoleModel,
                            as: 'userRoles',
                            attributes: [],
                            where: { role: ROLES.TEACHER },
                            required: true,
                        },
                    ],
                },
                {
                    model: model.instituteModel,
                    as: 'employeeInstitute',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'instituteCode'] },
                    required: false,
                },
            ],
            order: [['employeeName', 'ASC']],
        });

        if (!teachers.length) {
            return {
                result: [],
                totalCount: 0,
                page,
                limit,
                totalPages: 0,
            };
        }

        const teacherIds = teachers.map((t) => t.employeeId);

        const rows = await scoped(model.teacherSubjectMappingModel).findAll({
            where: {
                employeeId: teacherIds,
                ...teacherSubjectWhere(subjectIds),
            },
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            include: [
                {
                    model: model.employeeModel,
                    as: 'teacherEmployeeData',
                    attributes: [],
                    where: buildScope(model.employeeModel),
                    required: true,
                },
                {
                    model: model.subjectModel,
                    as: 'employeeSubject',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    where: {
                        ...(subjectId && { subjectId }),
                        ...(acedmicYearId != null && { acedmicYearId }),
                        ...buildScope(model.subjectModel),
                    },
                    required: true,
                    include: [
                        {
                            model: model.courseModel,
                            as: 'courseInfo',
                            attributes: ['courseId', 'courseName', 'courseCode', 'termType'],
                            where: buildScope(model.courseModel),
                            required: false,
                        },
                    ],
                },
            ],
            order: [['teacherSubjectMappingId', 'DESC']],
        });

        const groupsByKey = rows.reduce((acc, relation) => {
            const plain = relation.get({ plain: true });
            const courseId = plain?.employeeSubject?.courseId ?? 'none';
            const empId = plain.employeeId;
            const key = `${empId}_${courseId}`;

            if (!acc[key]) {
                acc[key] = {
                    employeeId: empId,
                    createdBy: plain.createdBy,
                    subjects: [],
                };
            }

            acc[key].subjects.push({
                ...plain.employeeSubject,
                teacherSubjectMappingId: plain.teacherSubjectMappingId,
                termType: plain.employeeSubject?.courseInfo?.termType ?? null,
            });
            return acc;
        }, {});

        let allGrouped = teachers.flatMap((teacher) => {
            const plainTeacher = teacher.get({ plain: true });
            const empId = plainTeacher.employeeId;
            const empGroupKeys = Object.keys(groupsByKey).filter((k) => k.startsWith(`${empId}_`));

            if (!empGroupKeys.length) {
                return [{
                    employeeId: empId,
                    teacherEmployeeData: plainTeacher,
                    employeeSubject: [],
                }];
            }

            return empGroupKeys.map((key) => ({
                employeeId: empId,
                createdBy: groupsByKey[key].createdBy,
                teacherEmployeeData: plainTeacher,
                employeeSubject: groupsByKey[key].subjects,
            }));
        });

        const trimmedSearch = search?.trim();
        if (trimmedSearch) {
            allGrouped = allGrouped.filter((row) => teacherSubjectRowMatchesSearch(row, trimmedSearch));
        }

        const totalCount = allGrouped.length;
        const offset = (page - 1) * limit;
        const result = allGrouped.slice(offset, offset + limit);

        return {
            result,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit) || 0,
        };
    } catch (error) {
        throw new Error(`Failed to fetch teacher subject mapping: ${error.message}`);
    }
}

export async function updateTeachersSubjectMapping(teacherSubjectMappingId, info) {
    try {
        const existing = await findTeacherSubjectMappingInInstitute(teacherSubjectMappingId);
        if (!existing) {
            throw new Error('Mapping not found');
        }

        if (info.employeeId != null) {
            const employee = await findEmployeeInInstitute(info.employeeId);
            if (!employee) {
                throw new Error(`Employee ID ${info.employeeId} not found`);
            }
        }

        if (info.subjectId != null) {
            const subject = await findSubjectInInstitute(info.subjectId);
            if (!subject) {
                throw new Error(`Subject ID ${info.subjectId} not found`);
            }
        }

        return await scoped(model.teacherSubjectMappingModel).update(info, {
            where: { teacherSubjectMappingId },
        });
    } catch (error) {
        console.error(`Error updating teacher subject mapping details ${teacherSubjectMappingId}:`, error);
        throw error;
    }
}

export async function deleteTeachersSubjectMapping(teacherSubjectMappingId) {
    try {
        const existing = await findTeacherSubjectMappingInInstitute(teacherSubjectMappingId);
        if (!existing) {
            throw new Error('Mapping not found');
        }

        await scoped(model.teacherSubjectMappingModel).destroy({
            where: { teacherSubjectMappingId },
            individualHooks: true,
        });
        return { message: 'teacher Subject Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw error;
    }
}

export async function getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId) {
    try {
        return await scoped(model.teacherSubjectMappingModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            where: { teacherSubjectMappingId },
        });
    } catch (error) {
        console.error(`Error in getting teacher details by teacher subject mapper id ${teacherSubjectMappingId}:`, error);
        throw error;
    }
}
