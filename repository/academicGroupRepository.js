import { Op } from 'sequelize';
import * as model from '../models/index.js';
import { scoped, buildScope } from '../utility/scoped.js';

const scopeListAttributes = [
    'academicGroupScopeId',
    'groupType',
    'title',
    'selectionScope',
    'courseId',
    'sessionId',
    'term',
    'academicContextType',
    'contextSubjectId',
    'activityName',
    'universityId',
    'instituteId',
    'academicYearId',
    'createdAt',
    'updatedAt',
];

const groupListAttributes = [
    'academicGroupId',
    'academicGroupScopeId',
    'groupName',
    'groupCode',
    'capacity',
    'publishStatus',
    'universityId',
    'instituteId',
    'academicYearId',
    'createdAt',
    'updatedAt',
];

const userListAttributes = [
    'academicGroupUserId',
    'academicGroupId',
    'userId',
    'role',
    'createdAt',
    'updatedAt',
];

const studentListAttributes = [
    'academicGroupStudentId',
    'academicGroupId',
    'studentId',
    'createdAt',
    'updatedAt',
];

export async function createScope(payload, transaction) {
    return scoped(model.academicGroupScopeModel).create(payload, { transaction });
}

export async function getScopeById(academicGroupScopeId) {
    return scoped(model.academicGroupScopeModel).findOne({
        where: { academicGroupScopeId: Number(academicGroupScopeId) },
        attributes: scopeListAttributes,
        include: [
            {
                model: model.courseModel,
                as: 'course',
                attributes: ['courseId', 'courseName'],
                required: false,
            },
            {
                model: model.sessionModel,
                as: 'session',
                attributes: ['sessionId', 'sessionName'],
                required: false,
            },
            {
                model: model.subjectModel,
                as: 'contextSubject',
                attributes: ['subjectId', 'subjectName'],
                required: false,
            },
            {
                model: model.academicGroupModel,
                as: 'group',
                attributes: groupListAttributes,
                required: false,
                where: buildScope(model.academicGroupModel),
            },
        ],
    });
}

export async function updateScope(academicGroupScopeId, payload, transaction) {
    const [count] = await scoped(model.academicGroupScopeModel).update(payload, {
        where: { academicGroupScopeId: Number(academicGroupScopeId) },
        transaction,
    });
    return count > 0;
}

export async function softDeleteScope(academicGroupScopeId, updatedBy, transaction) {
    const [count] = await scoped(model.academicGroupScopeModel).update(
        { updatedBy },
        {
            where: { academicGroupScopeId: Number(academicGroupScopeId) },
            transaction,
        },
    );
    if (count === 0) {
        return false;
    }
    await scoped(model.academicGroupScopeModel).destroy({
        where: { academicGroupScopeId: Number(academicGroupScopeId) },
        transaction,
    });
    return true;
}

export async function findGroupByScopeId(academicGroupScopeId, transaction) {
    return scoped(model.academicGroupModel).findOne({
        where: { academicGroupScopeId: Number(academicGroupScopeId) },
        attributes: groupListAttributes,
        transaction,
    });
}

export async function createGroup(payload, transaction) {
    return scoped(model.academicGroupModel).create(payload, { transaction });
}

export async function getGroupById(academicGroupId) {
    return scoped(model.academicGroupModel).findOne({
        where: { academicGroupId: Number(academicGroupId) },
        attributes: groupListAttributes,
        include: [
            {
                model: model.academicGroupScopeModel,
                as: 'scope',
                attributes: scopeListAttributes,
                required: true,
                where: buildScope(model.academicGroupScopeModel),
                include: [
                    {
                        model: model.courseModel,
                        as: 'course',
                        attributes: ['courseId', 'courseName'],
                        required: false,
                    },
                    {
                        model: model.sessionModel,
                        as: 'session',
                        attributes: ['sessionId', 'sessionName'],
                        required: false,
                    },
                    {
                        model: model.subjectModel,
                        as: 'contextSubject',
                        attributes: ['subjectId', 'subjectName'],
                        required: false,
                    },
                ],
            },
            {
                model: model.academicGroupUserModel,
                as: 'users',
                attributes: userListAttributes,
                required: false,
                where: buildScope(model.academicGroupUserModel),
                include: [
                    {
                        model: model.userModel,
                        as: 'user',
                        attributes: ['userId', 'userName', 'email'],
                        required: false,
                    },
                ],
            },
            {
                model: model.academicGroupStudentModel,
                as: 'students',
                attributes: studentListAttributes,
                required: false,
                where: buildScope(model.academicGroupStudentModel),
                include: [
                    {
                        model: model.studentModel,
                        as: 'student',
                        attributes: [
                            'studentId',
                            'firstName',
                            'middleName',
                            'lastName',
                            'enrollNumber',
                            'scholarNumber',
                        ],
                        required: false,
                    },
                ],
            },
        ],
    });
}

export async function updateGroup(academicGroupId, payload, transaction) {
    const [count] = await scoped(model.academicGroupModel).update(payload, {
        where: { academicGroupId: Number(academicGroupId) },
        transaction,
    });
    return count > 0;
}

export async function softDeleteGroup(academicGroupId, updatedBy, transaction) {
    const [count] = await scoped(model.academicGroupModel).update(
        { updatedBy },
        {
            where: { academicGroupId: Number(academicGroupId) },
            transaction,
        },
    );
    if (count === 0) {
        return false;
    }
    await scoped(model.academicGroupModel).destroy({
        where: { academicGroupId: Number(academicGroupId) },
        transaction,
    });
    return true;
}

export async function findGroupCode(groupCode, excludeAcademicGroupId) {
    const where = { groupCode };
    if (excludeAcademicGroupId != null) {
        where.academicGroupId = { [Op.ne]: Number(excludeAcademicGroupId) };
    }
    return scoped(model.academicGroupModel).findOne({
        where,
        attributes: ['academicGroupId', 'groupCode'],
    });
}

export async function getAllGroups({
    page = 1,
    limit = 10,
    search,
    courseId,
    sessionId,
    term,
    groupType,
    publishStatus,
}) {
    const where = {};
    if (publishStatus != null) {
        where.publishStatus = publishStatus;
    }
    if (search) {
        const like = `%${search}%`;
        where[Op.or] = [
            { groupName: { [Op.like]: like } },
            { groupCode: { [Op.like]: like } },
        ];
    }

    const scopeWhere = { ...buildScope(model.academicGroupScopeModel) };
    if (courseId != null) {
        scopeWhere.courseId = Number(courseId);
    }
    if (sessionId != null) {
        scopeWhere.sessionId = Number(sessionId);
    }
    if (term != null) {
        scopeWhere.term = Number(term);
    }
    if (groupType != null) {
        scopeWhere.groupType = groupType;
    }

    const offset = (Number(page) - 1) * Number(limit);

    return scoped(model.academicGroupModel).findAndCountAll({
        where,
        attributes: groupListAttributes,
        include: [
            {
                model: model.academicGroupScopeModel,
                as: 'scope',
                attributes: scopeListAttributes,
                required: true,
                where: scopeWhere,
            },
        ],
        order: [['academicGroupId', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
    });
}

export async function countGroupStudents(academicGroupId, transaction) {
    return scoped(model.academicGroupStudentModel).count({
        where: { academicGroupId: Number(academicGroupId) },
        transaction,
    });
}

export async function findExistingGroupStudents(academicGroupId, studentIds, transaction) {
    return scoped(model.academicGroupStudentModel).findAll({
        where: {
            academicGroupId: Number(academicGroupId),
            studentId: { [Op.in]: studentIds },
        },
        attributes: ['academicGroupStudentId', 'studentId'],
        transaction,
    });
}

export async function bulkCreateGroupStudents(rows, transaction) {
    return scoped(model.academicGroupStudentModel).bulkCreate(rows, { transaction });
}

export async function softDeleteGroupStudentsByGroupId(academicGroupId, updatedBy, transaction) {
    await scoped(model.academicGroupStudentModel).update(
        { updatedBy },
        {
            where: { academicGroupId: Number(academicGroupId) },
            transaction,
        },
    );
    return scoped(model.academicGroupStudentModel).destroy({
        where: { academicGroupId: Number(academicGroupId) },
        transaction,
    });
}

export async function softDeleteGroupStudents(where, updatedBy, transaction) {
    await scoped(model.academicGroupStudentModel).update(
        { updatedBy },
        { where, transaction },
    );
    return scoped(model.academicGroupStudentModel).destroy({
        where,
        transaction,
    });
}

export async function findExistingGroupUsers(academicGroupId, userIds, transaction) {
    return scoped(model.academicGroupUserModel).findAll({
        where: {
            academicGroupId: Number(academicGroupId),
            userId: { [Op.in]: userIds },
        },
        attributes: ['academicGroupUserId', 'userId', 'role'],
        transaction,
    });
}

export async function findPrimaryFaculty(academicGroupId, transaction) {
    return scoped(model.academicGroupUserModel).findOne({
        where: {
            academicGroupId: Number(academicGroupId),
            role: 'primary_faculty',
        },
        attributes: ['academicGroupUserId', 'userId', 'role'],
        transaction,
    });
}

export async function bulkCreateGroupUsers(rows, transaction) {
    return scoped(model.academicGroupUserModel).bulkCreate(rows, { transaction });
}

export async function getGroupUserById(academicGroupUserId) {
    return scoped(model.academicGroupUserModel).findOne({
        where: { academicGroupUserId: Number(academicGroupUserId) },
        attributes: userListAttributes,
    });
}

export async function updateGroupUser(academicGroupUserId, payload, transaction) {
    const [count] = await scoped(model.academicGroupUserModel).update(payload, {
        where: { academicGroupUserId: Number(academicGroupUserId) },
        transaction,
    });
    return count > 0;
}

export async function softDeleteGroupUsersByGroupId(academicGroupId, updatedBy, transaction) {
    await scoped(model.academicGroupUserModel).update(
        { updatedBy },
        {
            where: { academicGroupId: Number(academicGroupId) },
            transaction,
        },
    );
    return scoped(model.academicGroupUserModel).destroy({
        where: { academicGroupId: Number(academicGroupId) },
        transaction,
    });
}

export async function softDeleteGroupUsers(where, updatedBy, transaction) {
    await scoped(model.academicGroupUserModel).update(
        { updatedBy },
        { where, transaction },
    );
    return scoped(model.academicGroupUserModel).destroy({
        where,
        transaction,
    });
}

export async function studentExists(studentId) {
    return scoped(model.studentModel).findOne({
        where: { studentId: Number(studentId) },
        attributes: ['studentId'],
    });
}

export async function userExists(userId) {
    return scoped(model.userModel).findOne({
        where: { userId: Number(userId) },
        attributes: ['userId'],
    });
}

export async function subjectExists(subjectId) {
    return scoped(model.subjectModel).findOne({
        where: { subjectId: Number(subjectId) },
        attributes: ['subjectId'],
    });
}

export async function courseExists(courseId) {
    return scoped(model.courseModel).findOne({
        where: { courseId: Number(courseId) },
        attributes: ['courseId'],
    });
}

export async function sessionExists(sessionId) {
    return scoped(model.sessionModel).findOne({
        where: { sessionId: Number(sessionId) },
        attributes: ['sessionId'],
    });
}
