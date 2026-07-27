import sequelize from '../database/sequelizeConfig.js';
import { Op } from 'sequelize';
import * as academicGroupRepository from '../repository/academicGroupRepository.js';
import * as studentRepository from '../repository/studentRepository.js';

function normalizeScopeFields(body) {
    const selectionScope = body.selectionScope;
    const academicContextType = body.academicContextType;

    let courseId = body.courseId ?? null;
    let sessionId = body.sessionId ?? null;
    let term = body.term ?? null;
    let contextSubjectId = body.contextSubjectId ?? null;
    let activityName = body.activityName ?? null;

    if (selectionScope === 'program_specific') {
        if (courseId == null || sessionId == null || term == null) {
            throw new Error('courseId, sessionId and term are required for program_specific');
        }
    }

    if (academicContextType === 'course') {
        if (contextSubjectId == null) {
            throw new Error('contextSubjectId is required when academicContextType is course');
        }
        activityName = null;
    } else if (academicContextType === 'activity') {
        if (activityName == null || String(activityName).trim() === '') {
            throw new Error('activityName is required when academicContextType is activity');
        }
        contextSubjectId = null;
    } else {
        contextSubjectId = null;
        activityName = null;
    }

    return {
        groupType: body.groupType,
        title: body.title,
        selectionScope,
        courseId,
        sessionId,
        term,
        academicContextType,
        contextSubjectId,
        activityName,
    };
}

function buildGroupCode(groupName, academicGroupId) {
    const slug = String(groupName)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 12);
    const base = slug.length > 0 ? slug : 'GRP';
    return `${base}-${academicGroupId}`;
}

export async function createScope(body, createdBy, updatedBy) {
    const fields = normalizeScopeFields(body);

    if (fields.courseId != null) {
        const course = await academicGroupRepository.courseExists(fields.courseId);
        if (!course) {
            throw new Error('courseId not found');
        }
    }
    if (fields.sessionId != null) {
        const session = await academicGroupRepository.sessionExists(fields.sessionId);
        if (!session) {
            throw new Error('sessionId not found');
        }
    }
    if (fields.contextSubjectId != null) {
        const contextSubject = await academicGroupRepository.subjectExists(fields.contextSubjectId);
        if (!contextSubject) {
            throw new Error('contextSubjectId not found');
        }
    }

    return academicGroupRepository.createScope({
        ...fields,
        createdBy,
        updatedBy,
    });
}

export async function getScopeById(academicGroupScopeId) {
    return academicGroupRepository.getScopeById(academicGroupScopeId);
}

export async function updateScope(academicGroupScopeId, body, updatedBy) {
    const existing = await academicGroupRepository.getScopeById(academicGroupScopeId);
    if (!existing) {
        return false;
    }

    const merged = {
        groupType: body.groupType ?? existing.groupType,
        title: body.title ?? existing.title,
        selectionScope: body.selectionScope ?? existing.selectionScope,
        courseId: body.courseId !== undefined ? body.courseId : existing.courseId,
        sessionId: body.sessionId !== undefined ? body.sessionId : existing.sessionId,
        term: body.term !== undefined ? body.term : existing.term,
        academicContextType: body.academicContextType ?? existing.academicContextType,
        contextSubjectId: body.contextSubjectId !== undefined ? body.contextSubjectId : existing.contextSubjectId,
        activityName: body.activityName !== undefined ? body.activityName : existing.activityName,
    };

    const fields = normalizeScopeFields(merged);

    if (fields.courseId != null) {
        const course = await academicGroupRepository.courseExists(fields.courseId);
        if (!course) {
            throw new Error('courseId not found');
        }
    }
    if (fields.sessionId != null) {
        const session = await academicGroupRepository.sessionExists(fields.sessionId);
        if (!session) {
            throw new Error('sessionId not found');
        }
    }
    if (fields.contextSubjectId != null) {
        const contextSubject = await academicGroupRepository.subjectExists(fields.contextSubjectId);
        if (!contextSubject) {
            throw new Error('contextSubjectId not found');
        }
    }

    return academicGroupRepository.updateScope(academicGroupScopeId, {
        ...fields,
        updatedBy,
    });
}

export async function deleteScope(academicGroupScopeId, updatedBy) {
    const existing = await academicGroupRepository.getScopeById(academicGroupScopeId);
    if (!existing) {
        return false;
    }

    const transaction = await sequelize.transaction();
    try {
        const group = await academicGroupRepository.findGroupByScopeId(academicGroupScopeId, transaction);
        if (group) {
            await academicGroupRepository.softDeleteGroupUsersByGroupId(
                group.academicGroupId,
                updatedBy,
                transaction,
            );
            await academicGroupRepository.softDeleteGroupStudentsByGroupId(
                group.academicGroupId,
                updatedBy,
                transaction,
            );
            await academicGroupRepository.softDeleteGroup(
                group.academicGroupId,
                updatedBy,
                transaction,
            );
        }

        const deleted = await academicGroupRepository.softDeleteScope(
            academicGroupScopeId,
            updatedBy,
            transaction,
        );
        await transaction.commit();
        return deleted;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function createGroup(body, createdBy, updatedBy) {
    const academicGroupScopeId = Number(body.academicGroupScopeId);
    const scope = await academicGroupRepository.getScopeById(academicGroupScopeId);
    if (!scope) {
        throw new Error('academicGroupScopeId not found');
    }

    const existingGroup = await academicGroupRepository.findGroupByScopeId(academicGroupScopeId);
    if (existingGroup) {
        throw new Error('Scope already has a group');
    }

    const publishStatus = body.publishStatus ?? 'draft';
    let groupCode = body.groupCode != null && String(body.groupCode).trim() !== ''
        ? String(body.groupCode).trim()
        : null;

    if (groupCode != null) {
        const duplicate = await academicGroupRepository.findGroupCode(groupCode);
        if (duplicate) {
            throw new Error('groupCode already exists');
        }
    }

    const transaction = await sequelize.transaction();
    try {
        const group = await academicGroupRepository.createGroup(
            {
                academicGroupScopeId,
                groupName: body.groupName,
                groupCode,
                capacity: body.capacity ?? null,
                publishStatus,
                createdBy,
                updatedBy,
            },
            transaction,
        );

        if (groupCode == null) {
            groupCode = buildGroupCode(body.groupName, group.academicGroupId);
            await academicGroupRepository.updateGroup(
                group.academicGroupId,
                { groupCode, updatedBy },
                transaction,
            );
            group.groupCode = groupCode;
        }

        await transaction.commit();
        return group;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getGroupById(academicGroupId) {
    return academicGroupRepository.getGroupById(academicGroupId);
}

export async function getAllGroups(filters) {
    const { rows, count } = await academicGroupRepository.getAllGroups(filters);
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    return {
        result: rows,
        totalCount: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 0,
    };
}

export async function updateGroup(academicGroupId, body, updatedBy) {
    const existing = await academicGroupRepository.getGroupById(academicGroupId);
    if (!existing) {
        return false;
    }

    const payload = { updatedBy };

    if (body.groupName != null) {
        payload.groupName = body.groupName;
    }
    if (body.capacity !== undefined) {
        payload.capacity = body.capacity;
    }
    if (body.publishStatus != null) {
        payload.publishStatus = body.publishStatus;
    }
    if (body.groupCode !== undefined) {
        const nextCode = body.groupCode == null || String(body.groupCode).trim() === ''
            ? null
            : String(body.groupCode).trim();
        if (nextCode != null) {
            const duplicate = await academicGroupRepository.findGroupCode(nextCode, academicGroupId);
            if (duplicate) {
                throw new Error('groupCode already exists');
            }
        }
        payload.groupCode = nextCode;
    }

    return academicGroupRepository.updateGroup(academicGroupId, payload);
}

export async function publishGroup(academicGroupId, updatedBy) {
    const existing = await academicGroupRepository.getGroupById(academicGroupId);
    if (!existing) {
        return false;
    }
    if (existing.publishStatus === 'published') {
        throw new Error('Group is already published');
    }
    if (!existing.groupName) {
        throw new Error('groupName is required to publish');
    }

    return academicGroupRepository.updateGroup(academicGroupId, {
        publishStatus: 'published',
        updatedBy,
    });
}

export async function deleteGroup(academicGroupId, updatedBy) {
    const existing = await academicGroupRepository.getGroupById(academicGroupId);
    if (!existing) {
        return false;
    }

    const transaction = await sequelize.transaction();
    try {
        await academicGroupRepository.softDeleteGroupUsersByGroupId(
            academicGroupId,
            updatedBy,
            transaction,
        );
        await academicGroupRepository.softDeleteGroupStudentsByGroupId(
            academicGroupId,
            updatedBy,
            transaction,
        );
        const deleted = await academicGroupRepository.softDeleteGroup(
            academicGroupId,
            updatedBy,
            transaction,
        );
        await transaction.commit();
        return deleted;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

function normalizeUsersPayload(body) {
    if (Array.isArray(body.users) && body.users.length > 0) {
        return body.users;
    }
    if (body.userId != null && body.role != null) {
        return [{ userId: body.userId, role: body.role }];
    }
    throw new Error('users array or userId with role is required');
}

export async function addUsers(body, createdBy, updatedBy) {
    const academicGroupId = Number(body.academicGroupId);
    const group = await academicGroupRepository.getGroupById(academicGroupId);
    if (!group) {
        throw new Error('academicGroupId not found');
    }

    const users = normalizeUsersPayload(body);
    const userIds = [];
    let primaryCount = 0;
    for (const row of users) {
        userIds.push(Number(row.userId));
        if (row.role === 'primary_faculty') {
            primaryCount += 1;
        }
    }
    if (primaryCount > 1) {
        throw new Error('Only one primary_faculty is allowed per request');
    }

    for (const row of users) {
        const user = await academicGroupRepository.userExists(row.userId);
        if (!user) {
            throw new Error(`userId not found: ${row.userId}`);
        }
    }

    const existingRows = await academicGroupRepository.findExistingGroupUsers(
        academicGroupId,
        userIds,
    );
    if (existingRows.length > 0) {
        throw new Error('One or more users are already assigned to this group');
    }

    if (primaryCount === 1) {
        const existingPrimary = await academicGroupRepository.findPrimaryFaculty(academicGroupId);
        if (existingPrimary) {
            throw new Error('Group already has a primary_faculty');
        }
    }

    const rows = [];
    for (const row of users) {
        rows.push({
            academicGroupId,
            userId: Number(row.userId),
            role: row.role,
            createdBy,
            updatedBy,
        });
    }

    return academicGroupRepository.bulkCreateGroupUsers(rows);
}

export async function updateUser(academicGroupUserId, body, updatedBy) {
    const existing = await academicGroupRepository.getGroupUserById(academicGroupUserId);
    if (!existing) {
        return false;
    }

    const nextRole = body.role ?? existing.role;
    if (nextRole === 'primary_faculty' && existing.role !== 'primary_faculty') {
        const existingPrimary = await academicGroupRepository.findPrimaryFaculty(
            existing.academicGroupId,
        );
        if (existingPrimary) {
            throw new Error('Group already has a primary_faculty');
        }
    }

    return academicGroupRepository.updateGroupUser(academicGroupUserId, {
        role: nextRole,
        updatedBy,
    });
}

export async function deleteUsers(body, updatedBy) {
    const where = {};
    if (body.academicGroupUserId != null) {
        where.academicGroupUserId = Number(body.academicGroupUserId);
    } else if (body.academicGroupId != null && body.userId != null) {
        where.academicGroupId = Number(body.academicGroupId);
        where.userId = Number(body.userId);
    } else {
        throw new Error('academicGroupUserId or academicGroupId with userId is required');
    }

    const deleted = await academicGroupRepository.softDeleteGroupUsers(where, updatedBy);
    return deleted > 0;
}

export async function addStudents(body, createdBy, updatedBy) {
    const academicGroupId = Number(body.academicGroupId);
    const group = await academicGroupRepository.getGroupById(academicGroupId);
    if (!group) {
        throw new Error('academicGroupId not found');
    }

    const studentIds = [];
    const seen = new Set();
    for (const studentId of body.studentIds) {
        const id = Number(studentId);
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        studentIds.push(id);
    }

    if (studentIds.length === 0) {
        throw new Error('studentIds is required');
    }

    for (const studentId of studentIds) {
        const student = await academicGroupRepository.studentExists(studentId);
        if (!student) {
            throw new Error(`studentId not found: ${studentId}`);
        }
    }

    const existingRows = await academicGroupRepository.findExistingGroupStudents(
        academicGroupId,
        studentIds,
    );
    if (existingRows.length > 0) {
        throw new Error('One or more students are already assigned to this group');
    }

    if (group.capacity != null) {
        const currentCount = await academicGroupRepository.countGroupStudents(academicGroupId);
        if (currentCount + studentIds.length > Number(group.capacity)) {
            throw new Error('Adding students would exceed group capacity');
        }
    }

    const rows = [];
    for (const studentId of studentIds) {
        rows.push({
            academicGroupId,
            studentId,
            createdBy,
            updatedBy,
        });
    }

    return academicGroupRepository.bulkCreateGroupStudents(rows);
}

/**
 * Students matching group scope (course/session/term) who are not already in this group.
 */
export async function getAvailableStudents(academicGroupId, filters) {
    const group = await academicGroupRepository.getGroupById(academicGroupId);
    if (!group) {
        throw new Error('academicGroupId not found');
    }

    const plain = typeof group.get === 'function' ? group.get({ plain: true }) : group;
    const scope = plain.scope;
    if (!scope) {
        throw new Error('Group scope not found');
    }

    const memberStudentIds = await academicGroupRepository.getMemberStudentIds(academicGroupId);
    const memberCount = memberStudentIds.length;

    const list = await studentRepository.getAllStudents({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        courseId: filters.courseId != null ? filters.courseId : scope.courseId,
        sessionId: filters.sessionId != null ? filters.sessionId : scope.sessionId,
        classSectionsId: filters.classSectionsId,
        year: filters.year,
        term: filters.term != null ? filters.term : scope.term,
        academicYearId: filters.academicYearId,
        excludeStudentIds: memberStudentIds,
    });

    const capacity = plain.capacity != null ? Number(plain.capacity) : null;
    const remainingCapacity = capacity == null ? null : Math.max(capacity - memberCount, 0);

    return {
        ...list,
        academicGroupId: Number(academicGroupId),
        capacity,
        memberCount,
        remainingCapacity,
    };
}

export async function deleteStudents(body, updatedBy) {
    const where = {};
    if (body.academicGroupStudentId != null) {
        where.academicGroupStudentId = Number(body.academicGroupStudentId);
    } else if (body.academicGroupId != null && Array.isArray(body.studentIds) && body.studentIds.length > 0) {
        const studentIds = [];
        for (const studentId of body.studentIds) {
            studentIds.push(Number(studentId));
        }
        where.academicGroupId = Number(body.academicGroupId);
        where.studentId = { [Op.in]: studentIds };
    } else {
        throw new Error('academicGroupStudentId or academicGroupId with studentIds is required');
    }

    const deleted = await academicGroupRepository.softDeleteGroupStudents(where, updatedBy);
    return deleted > 0;
}
