import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

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

export async function getTeacherSubjectMapping(employeeId, subjectId, yearId, subjectIds) {
    try {
        const subjectWhere = {
            ...(subjectId && { subjectId }),
            ...(yearId != null && { acedmicYearId: yearId }),
            ...buildScope(model.subjectModel),
        };

        const employeeWhere = buildScope(model.employeeModel);

        return await scoped(model.teacherSubjectMappingModel).findAll({
            where: {
                ...(employeeId && { employeeId }),
                ...teacherSubjectWhere(subjectIds),
            },
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            include: [
                {
                    model: model.employeeModel,
                    as: 'teacherEmployeeData',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: employeeWhere,
                    required: true,
                    include: [
                        {
                            model: model.instituteModel,
                            as: 'employeeInstitute',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'instituteCode'] },
                            required: false,
                        },
                    ],
                },
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
                    ],
                },
            ],
        });
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
