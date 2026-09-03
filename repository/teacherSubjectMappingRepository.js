import { Op, Sequelize } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
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

async function findEmployeeInInstitute(userId) {
    return scoped(model.employeeModel).findOne({
        where: { userId },
        attributes: ['userId'],
    });
}

async function findSubjectInInstitute(subjectId) {
    return scoped(model.subjectModel).findOne({
        attributes: ['subjectId'],
        where: { subjectId },
    });
}

export async function findSubjectIdsForYear(academicYearId) {
    const rows = await scoped(model.subjectModel).findAll({
        attributes: ['subjectId'],
        where: { academicYearId },
        raw: true,
    });
    const ids = [];
    for (const row of rows) {
        ids.push(row.subjectId);
    }
    return ids;
}

export async function findSubjectIdsForSession(sessionId, academicYearId) {
    const mappings = await scoped(model.sessionCouseMappingModel).findAll({
        attributes: ['courseId'],
        where: { sessionId },
        raw: true,
    });

    const courseIds = [];
    const seenCourses = new Set();
    for (const row of mappings) {
        const courseId = Number(row.courseId);
        if (!courseId || seenCourses.has(courseId)) {
            continue;
        }
        seenCourses.add(courseId);
        courseIds.push(courseId);
    }

    if (!courseIds.length) {
        return [];
    }

    const where = { courseId: { [Op.in]: courseIds } };
    if (academicYearId != null) {
        where.academicYearId = academicYearId;
    }

    const rows = await scoped(model.subjectModel).findAll({
        attributes: ['subjectId'],
        where,
        raw: true,
    });

    const ids = [];
    for (const row of rows) {
        ids.push(row.subjectId);
    }
    return ids;
}

export async function resolveSubjectIdsForTeacherFilters({ academicYearId, sessionId } = {}) {
    let subjectIds = null;

    if (academicYearId != null) {
        subjectIds = await findSubjectIdsForYear(academicYearId);
    }

    if (sessionId != null) {
        const sessionSubjectIds = await findSubjectIdsForSession(sessionId, academicYearId);
        if (subjectIds != null) {
            const allowed = new Set(sessionSubjectIds);
            const filtered = [];
            for (const id of subjectIds) {
                if (allowed.has(id)) {
                    filtered.push(id);
                }
            }
            subjectIds = filtered;
        } else {
            subjectIds = sessionSubjectIds;
        }
    }

    return subjectIds;
}

async function findTeacherSubjectMappingInInstitute(teacherSubjectMappingId) {
    return scoped(model.teacherSubjectMappingModel).findOne({
        where: { teacherSubjectMappingId },
        attributes: ['teacherSubjectMappingId', 'userId', 'subjectId'],
        include: [
            {
                model: model.employeeModel,
                as: 'teacherEmployeeData',
                where: buildScope(model.employeeModel),
                required: true,
                attributes: ['userId'],
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

async function findExistingTeacherSubjectMapping(userId, subjectId) {
    return scoped(model.teacherSubjectMappingModel).findOne({
        where: { userId, subjectId },
        attributes: ['teacherSubjectMappingId', 'userId', 'subjectId'],
    });
}

export async function teacherSubjectMapping(data) {
    try {
        const employee = await findEmployeeInInstitute(data.userId);
        if (!employee) {
            throw new Error(`Employee ID ${data.userId} not found`);
        }

        const subject = await findSubjectInInstitute(data.subjectId);
        if (!subject) {
            throw new Error(`Subject ID ${data.subjectId} not found`);
        }

        const existing = await findExistingTeacherSubjectMapping(data.userId, data.subjectId);
        if (existing) {
            const error = new Error(
                `Teacher is already mapped to subject ${data.subjectId}`,
            );
            error.statusCode = 409;
            throw error;
        }

        return await scoped(model.teacherSubjectMappingModel).create(data);
    } catch (error) {
        console.error('Error in teacher Subject Mapping:', error);
        throw error;
    }
}

export async function findMappedTeacherUserIds({ userId, subjectId, subjectIds, academicYearId }) {
    const rows = await scoped(model.teacherSubjectMappingModel).findAll({
        attributes: ['userId'],
        where: {
            ...(userId && { userId }),
            ...teacherSubjectWhere(subjectIds),
        },
        include: [
            {
                model: model.subjectModel,
                as: 'employeeSubject',
                attributes: [],
                where: {
                    ...(subjectId && { subjectId }),
                    ...(academicYearId != null && { academicYearId }),
                    ...buildScope(model.subjectModel),
                },
                required: true,
            },
        ],
    });

    const ids = [];
    const seen = new Set();
    for (const row of rows) {
        const id = Number(row.userId);
        if (!id || seen.has(id)) {
            continue;
        }
        seen.add(id);
        ids.push(id);
    }
    return ids;
}

export async function findRoleTeacherUserIds(userId) {
    const rows = await scoped(model.employeeModel).findAll({
        attributes: ['userId'],
        where: {
            ...(userId && { userId }),
            ...buildScope(model.employeeModel),
        },
        include: [
            {
                model: model.roleModel,
                as: 'employeeRole',
                attributes: [],
                required: true,
                where: Sequelize.where(
                    Sequelize.fn('UPPER', Sequelize.col('employeeRole.role')),
                    ROLES.TEACHER,
                ),
            },
        ],
    });

    const ids = [];
    const seen = new Set();
    for (const row of rows) {
        const id = Number(row.userId);
        if (!id || seen.has(id)) {
            continue;
        }
        seen.add(id);
        ids.push(id);
    }
    return ids;
}

/**
 * DB: published date-wise cells with teacher assignments + subject joins.
 */
export async function findDateWiseTeacherSubjectRows({
    userId,
    userIds,
    subjectId,
    subjectIds,
    sessionId,
    academicYearId,
}) {
    const teacherWhere = {};
    if (userId != null) {
        teacherWhere.userId = Number(userId);
    } else if (userIds != null && userIds.length > 0) {
        teacherWhere.userId = { [Op.in]: userIds };
    }

    if (subjectIds != null && !subjectIds.length) {
        return [];
    }

    const subjectWhere = {
        ...(subjectId != null ? { subjectId: Number(subjectId) } : {}),
        ...(academicYearId != null ? { academicYearId: Number(academicYearId) } : {}),
        ...buildScope(model.subjectModel),
    };
    if (subjectIds != null) {
        subjectWhere.subjectId = subjectId != null
            ? Number(subjectId)
            : { [Op.in]: subjectIds };
    }

    const sectionRequired = sessionId != null;
    const sectionWhere = sessionId != null
        ? { sessionId: Number(sessionId), ...buildScope(model.classSectionModel) }
        : undefined;

    return model.timeTableCellDateWiseModel.findAll({
        attributes: ['timeTableCellDateWiseId', 'subjectId', 'timeTableCellId'],
        include: [
            {
                model: model.timeTableCellTeachersDateWiseModel,
                as: 'timeTableCellTeachersDateWise',
                required: true,
                attributes: ['userId'],
                ...(Object.keys(teacherWhere).length > 0 ? { where: teacherWhere } : {}),
            },
            {
                model: model.timeTableCellModel,
                as: 'timeTableCell',
                required: true,
                attributes: [
                    'timeTableCellId',
                    'subjectId',
                    'electiveSubjectId',
                    'teacherSubjectMappingId',
                ],
                include: [
                    {
                        model: model.timeTableRoutineModel,
                        as: 'timeTableRoutine',
                        required: true,
                        attributes: ['timeTableRoutineId'],
                        where: {
                            isPublish: true,
                            ...buildScope(model.timeTableRoutineModel),
                        },
                        include: [
                            {
                                model: model.classSectionTermModel,
                                as: 'timeTableClassSectionTerm',
                                required: sectionRequired,
                                attributes: ['classSectionTermId', 'classSectionsId'],
                                include: [
                                    {
                                        model: model.classSectionModel,
                                        as: 'classSection',
                                        required: sectionRequired,
                                        attributes: ['classSectionsId', 'sessionId'],
                                        ...(sectionWhere ? { where: sectionWhere } : {}),
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: model.subjectModel,
                        as: 'timeTableSubject',
                        required: false,
                        attributes: {
                            exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
                        },
                        where: subjectWhere,
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
                    {
                        model: model.teacherSubjectMappingModel,
                        as: 'timeTableTeacherSubject',
                        required: false,
                        attributes: ['teacherSubjectMappingId', 'subjectId'],
                        include: [
                            {
                                model: model.subjectModel,
                                as: 'employeeSubject',
                                required: false,
                                attributes: {
                                    exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
                                },
                                where: subjectWhere,
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
                    },
                ],
            },
        ],
    });
}

export async function findEmployeesByUserIds(userIds) {
    if (!userIds || userIds.length === 0) {
        return [];
    }

    return scoped(model.employeeModel).findAll({
        where: {
            userId: { [Op.in]: userIds },
            ...buildScope(model.employeeModel),
        },
        attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
        include: [
            {
                model: model.instituteModel,
                as: 'employeeInstitute',
                attributes: {
                    exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'instituteCode'],
                },
                required: false,
            },
        ],
        order: [['employeeName', 'ASC']],
    });
}

export async function findTeacherSubjectMappingRows({
    userIds,
    subjectId,
    subjectIds,
    academicYearId,
}) {
    if (!userIds || userIds.length === 0) {
        return [];
    }

    return scoped(model.teacherSubjectMappingModel).findAll({
        where: {
            userId: { [Op.in]: userIds },
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
                attributes: {
                    exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
                },
                where: {
                    ...(subjectId && { subjectId }),
                    ...(academicYearId != null && { academicYearId }),
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
}

export async function updateTeachersSubjectMapping(teacherSubjectMappingId, info) {
    try {
        const existing = await findTeacherSubjectMappingInInstitute(teacherSubjectMappingId);
        if (!existing) {
            throw new Error('Mapping not found');
        }

        if (info.userId != null) {
            const employee = await findEmployeeInInstitute(info.userId);
            if (!employee) {
                throw new Error(`Employee ID ${info.userId} not found`);
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
