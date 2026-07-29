import sequelize from '../database/sequelizeConfig.js';
import { Op } from 'sequelize';
import * as academicGroupRepository from '../repository/academicGroupRepository.js';
import * as studentRepository from '../repository/studentRepository.js';

function asPlain(row) {
    if (row == null) {
        return null;
    }
    return typeof row.toJSON === 'function' ? row.toJSON() : row;
}

function studentDisplayName(student) {
    if (student == null) {
        return null;
    }
    const parts = [student.firstName, student.middleName, student.lastName].filter(
        (part) => part != null && String(part).trim() !== '',
    );
    return parts.length > 0 ? parts.join(' ') : null;
}

/** Flattened keys for list cards / print sheets. */
function buildGroupPrint(groupPlain) {
    const scope = groupPlain.scope || {};
    const users = Array.isArray(groupPlain.users) ? groupPlain.users : [];
    const students = Array.isArray(groupPlain.students) ? groupPlain.students : [];

    const faculty = [];
    for (const row of users) {
        const user = row.user || {};
        const employee = user.employee || {};
        faculty.push({
            userId: row.userId,
            role: row.role,
            userName: user.userName ?? null,
            email: user.email ?? null,
            phone: user.phone ?? null,
            employeeId: employee.employeeId ?? null,
            employeeName: employee.employeeName ?? null,
            employeeCode: employee.employeeCode ?? null,
        });
    }

    const studentRows = [];
    for (const row of students) {
        const student = row.student || {};
        studentRows.push({
            studentId: row.studentId,
            studentName: studentDisplayName(student),
            enrollNumber: student.enrollNumber ?? null,
            scholarNumber: student.scholarNumber ?? null,
            email: student.email ?? null,
            phoneNumber: student.phoneNumber ?? null,
            mobileNumber: student.mobileNumber ?? null,
            currentClass: student.currentClass ?? null,
        });
    }

    return {
        academicGroupId: groupPlain.academicGroupId,
        groupName: groupPlain.groupName,
        groupCode: groupPlain.groupCode,
        capacity: groupPlain.capacity,
        publishStatus: groupPlain.publishStatus,
        memberCount: studentRows.length,
        remainingCapacity:
            groupPlain.capacity == null
                ? null
                : Math.max(0, Number(groupPlain.capacity) - studentRows.length),
        groupType: scope.groupType ?? null,
        title: scope.title ?? null,
        selectionScope: scope.selectionScope ?? null,
        term: scope.term ?? null,
        termType: scope.termType ?? scope.course?.termType ?? null,
        structure: scope.structure ?? [],
        academicContextType: scope.academicContextType ?? null,
        activityName: scope.activityName ?? null,
        courseId: scope.courseId ?? null,
        courseName: scope.course?.courseName ?? null,
        courseCode: scope.course?.courseCode ?? null,
        sessionId: scope.sessionId ?? null,
        sessionName: scope.session?.sessionName ?? null,
        subjectId: scope.contextSubjectId ?? null,
        subjectName: scope.contextSubject?.subjectName ?? null,
        faculty,
        students: studentRows,
    };
}

function withGroupPrint(row) {
    const plain = asPlain(row);
    if (plain == null) {
        return null;
    }
    if (plain.scope) {
        plain.scope = academicGroupRepository.formatScopePlain(plain.scope);
    }
    plain.print = buildGroupPrint(plain);
    return plain;
}

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

export async function getAllScopes(filters) {
    return academicGroupRepository.getAllScopes(filters);
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
        const groups = await academicGroupRepository.findGroupsByScopeId(
            academicGroupScopeId,
            transaction,
        );
        for (const group of groups) {
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
    const row = await academicGroupRepository.getGroupById(academicGroupId);
    return withGroupPrint(row);
}

export async function getAllGroups(filters) {
    const { rows, count } = await academicGroupRepository.getAllGroups(filters);
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const result = [];
    for (const row of rows) {
        result.push(withGroupPrint(row));
    }
    return {
        result,
        totalCount: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 0,
    };
}

export async function updateGroup(academicGroupId, body, updatedBy) {
    const existing = await academicGroupRepository.getGroupWithScope(academicGroupId);
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
    const existing = await academicGroupRepository.getGroupWithScope(academicGroupId);
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
    const existing = await academicGroupRepository.getGroupWithScope(academicGroupId);
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

export async function getGroupUsers(academicGroupId) {
    const group = await academicGroupRepository.getGroupWithScope(academicGroupId);
    if (!group) {
        throw new Error('academicGroupId not found');
    }

    return academicGroupRepository.getGroupUsersByAcademicGroupId(academicGroupId);
}

export async function addUsers(body, createdBy, updatedBy) {
    const academicGroupId = Number(body.academicGroupId);
    const group = await academicGroupRepository.getGroupWithScope(academicGroupId);
    if (!group) {
        throw new Error('academicGroupId not found');
    }

    const usersRaw = normalizeUsersPayload(body);
    const users = [];
    const seenUserRoles = new Set();

    for (const row of usersRaw) {
        const userId = Number(row.userId);
        const userRoleKey = `${userId}_${row.role}`;
        if (seenUserRoles.has(userRoleKey)) {
            throw new Error(`Duplicate userId and role in request: ${userId} with ${row.role}`);
        }
        seenUserRoles.add(userRoleKey);
        users.push({ userId, role: row.role });
    }

    if (users.length === 0) {
        throw new Error('users are required');
    }

    const userIds = [];
    for (const row of users) {
        userIds.push(row.userId);
        const user = await academicGroupRepository.userExists(row.userId);
        if (!user) {
            throw new Error(`userId not found: ${row.userId}`);
        }
    }

    const existingRows = await academicGroupRepository.findGroupUsersIncludingDeleted(
        academicGroupId,
        userIds,
    );

    const activeUserRoles = [];
    const deletedByUserRole = new Map();
    for (const row of existingRows) {
        const userId = Number(row.userId);
        const userRoleKey = `${userId}_${row.role}`;
        if (row.deletedAt == null) {
            activeUserRoles.push(userRoleKey);
        } else if (!deletedByUserRole.has(userRoleKey)) {
            deletedByUserRole.set(userRoleKey, row);
        }
    }

    for (const row of users) {
        const userRoleKey = `${row.userId}_${row.role}`;
        if (activeUserRoles.includes(userRoleKey)) {
            throw new Error(`User ${row.userId} is already assigned to this group with role ${row.role}`);
        }
    }

    const transaction = await sequelize.transaction();
    try {
        const results = [];
        const toCreate = [];

        for (const row of users) {
            const userRoleKey = `${row.userId}_${row.role}`;
            const deleted = deletedByUserRole.get(userRoleKey);
            if (deleted) {
                const restored = await academicGroupRepository.restoreGroupUser(
                    deleted.academicGroupUserId,
                    { role: row.role, updatedBy },
                    transaction,
                );
                results.push(restored);
            } else {
                toCreate.push({
                    academicGroupId,
                    userId: row.userId,
                    role: row.role,
                    createdBy,
                    updatedBy,
                });
            }
        }

        if (toCreate.length > 0) {
            const created = await academicGroupRepository.bulkCreateGroupUsers(toCreate, transaction);
            for (const row of created) {
                results.push(row);
            }
        }

        await transaction.commit();
        return results;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function updateUser(academicGroupUserId, body, updatedBy) {
    const existing = await academicGroupRepository.getGroupUserById(academicGroupUserId);
    if (!existing) {
        return false;
    }

    const nextRole = body.role ?? existing.role;

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
    const group = await academicGroupRepository.getGroupWithScope(academicGroupId);
    if (!group) {
        throw new Error('academicGroupId not found');
    }

    const plain = typeof group.get === 'function' ? group.get({ plain: true }) : group;
    const scope = plain.scope;

    const studentIds = [];
    const seen = new Set();
    for (const studentId of body.studentIds) {
        const id = Number(studentId);
        if (seen.has(id)) {
            throw new Error(`Duplicate studentId in request: ${id}`);
        }
        seen.add(id);
        studentIds.push(id);
    }

    if (studentIds.length === 0) {
        throw new Error('studentIds is required');
    }

    for (const studentId of studentIds) {
        const student = scope != null && scope.selectionScope === 'program_specific'
            ? await academicGroupRepository.studentExistsInScope(studentId, {
                courseId: scope.courseId,
                sessionId: scope.sessionId,
            })
            : await academicGroupRepository.studentExists(studentId);

        if (!student) {
            throw new Error(
                scope != null && scope.selectionScope === 'program_specific'
                    ? `studentId ${studentId} not found in group course/session scope`
                    : `studentId not found: ${studentId}`,
            );
        }
    }

    const existingRows = await academicGroupRepository.findGroupStudentsIncludingDeleted(
        academicGroupId,
        studentIds,
    );

    const activeStudentIds = [];
    const deletedByStudentId = new Map();
    for (const row of existingRows) {
        const studentId = Number(row.studentId);
        if (row.deletedAt == null) {
            activeStudentIds.push(studentId);
        } else if (!deletedByStudentId.has(studentId)) {
            deletedByStudentId.set(studentId, row);
        }
    }

    if (activeStudentIds.length > 0) {
        throw new Error(
            `studentId already assigned to this group (no duplicate studentId): ${activeStudentIds.join(', ')}`,
        );
    }

    if (plain.capacity != null) {
        const currentCount = await academicGroupRepository.countGroupStudents(academicGroupId);
        if (currentCount + studentIds.length > Number(plain.capacity)) {
            throw new Error('Adding students would exceed group capacity');
        }
    }

    const transaction = await sequelize.transaction();
    try {
        const results = [];
        const toCreate = [];

        for (const studentId of studentIds) {
            const deleted = deletedByStudentId.get(studentId);
            if (deleted) {
                const restored = await academicGroupRepository.restoreGroupStudent(
                    deleted.academicGroupStudentId,
                    updatedBy,
                    transaction,
                );
                results.push(restored);
            } else {
                toCreate.push({
                    academicGroupId,
                    studentId,
                    createdBy,
                    updatedBy,
                });
            }
        }

        if (toCreate.length > 0) {
            const created = await academicGroupRepository.bulkCreateGroupStudents(
                toCreate,
                transaction,
            );
            for (const row of created) {
                results.push(row);
            }
        }

        await transaction.commit();
        return results;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Students for group scope course+session, placed on class_sections for related terms,
 * excluding anyone already in academic_group_student or whose userId is in academic_group_user.
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
    if (scope.courseId == null || scope.sessionId == null) {
        throw new Error('Group scope requires courseId and sessionId');
    }

    let terms = filters.term;
    if (terms == null && scope.term != null) {
        terms = [Number(scope.term)];
    }

    const memberStudentIds = await academicGroupRepository.getMemberStudentIds(academicGroupId);
    const studentIdsLinkedToMemberUsers =
        await academicGroupRepository.getStudentIdsForMemberUsers(academicGroupId);

    const excludeStudentIds = [];
    const seenExclude = new Set();
    for (const id of memberStudentIds) {
        const n = Number(id);
        if (seenExclude.has(n)) {
            continue;
        }
        seenExclude.add(n);
        excludeStudentIds.push(n);
    }
    for (const id of studentIdsLinkedToMemberUsers) {
        const n = Number(id);
        if (seenExclude.has(n)) {
            continue;
        }
        seenExclude.add(n);
        excludeStudentIds.push(n);
    }

    const memberCount = memberStudentIds.length;

    const eligibleStudentIds = await academicGroupRepository.resolveEligibleStudentIds({
        courseId: Number(scope.courseId),
        sessionId: Number(scope.sessionId),
        terms,
        classSectionsId: filters.classSectionsId,
        year: filters.year,
        excludeStudentIds,
    });

    const list = await studentRepository.getAllStudents({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        courseId: Number(scope.courseId),
        sessionId: Number(scope.sessionId),
        academicYearId: filters.academicYearId,
        includeStudentIds: eligibleStudentIds,
    });

    const capacity = plain.capacity != null ? Number(plain.capacity) : null;
    const remainingCapacity = capacity == null ? null : Math.max(capacity - memberCount, 0);

    return {
        ...list,
        academicGroupId: Number(academicGroupId),
        courseId: Number(scope.courseId),
        sessionId: Number(scope.sessionId),
        terms: terms ?? null,
        capacity,
        memberCount,
        remainingCapacity,
    };
}

/**
 * Teachers available to assign to the group.
 * Excludes userIds already in academic_group_user and userIds of students already in the group.
 */
export async function getAvailableUsers(academicGroupId, filters) {
    const group = await academicGroupRepository.getGroupById(academicGroupId);
    if (!group) {
        throw new Error('academicGroupId not found');
    }

    const memberUserIds = await academicGroupRepository.getMemberUserIds(academicGroupId);
    const userIdsOfMemberStudents =
        await academicGroupRepository.getUserIdsForMemberStudents(academicGroupId);

    const excludeUserIds = [];
    const seenExclude = new Set();
    for (const id of memberUserIds) {
        const n = Number(id);
        if (seenExclude.has(n)) {
            continue;
        }
        seenExclude.add(n);
        excludeUserIds.push(n);
    }
    for (const id of userIdsOfMemberStudents) {
        const n = Number(id);
        if (seenExclude.has(n)) {
            continue;
        }
        seenExclude.add(n);
        excludeUserIds.push(n);
    }

    const { rows, count } = await academicGroupRepository.findAvailableUsers({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        campusId: filters.campusId,
        subjectId: filters.subjectId,
        excludeUserIds,
    });

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;

    return {
        result: rows,
        totalCount: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 0,
        academicGroupId: Number(academicGroupId),
        facultyMemberCount: memberUserIds.length,
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
