import { Op, Sequelize } from 'sequelize';
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

/** User fields safe to expose (no password). */
const userDetailAttributes = [
    'userId',
    'universityId',
    'defaultInstituteId',
    'defaultRoleId',
    'defaultAcademicYearId',
    'userName',
    'uniqueId',
    'status',
    'phone',
    'email',
    'isTeacher',
    'createdAt',
    'updatedAt',
];

/** Employee basics nested under faculty user. */
const employeeDetailAttributes = [
    'employeeId',
    'userId',
    'employeeCode',
    'employeeName',
    'departmentId',
    'employmentType',
    'campusId',
    'instituteId',
    'roleId',
];

/**
 * Student identity / contact / placement fields for list + print.
 * Omits bank / identity-document fields.
 */
const studentDetailAttributes = [
    'studentId',
    'userId',
    'universityId',
    'campusId',
    'instituteId',
    'courseLevelId',
    'courseId',
    'specializationId',
    'sessionId',
    'classSectionTermId',
    'scholarNumber',
    'enrollNumber',
    'firstName',
    'middleName',
    'lastName',
    'fatherName',
    'motherName',
    'birthDate',
    'admisssionDate',
    'enrollDate',
    'studentAdmissionStatus',
    'currentClass',
    'phoneNumber',
    'mobileNumber',
    'email',
    'parentEmail',
    'parentNumber',
    'studentStatus',
    'documentStatus',
    'feeStatus',
    'createdAt',
    'updatedAt',
];

function scopeNameIncludes() {
    return [
        {
            model: model.courseModel,
            as: 'course',
            attributes: ['courseId', 'courseName', 'courseCode'],
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
    ];
}

function groupUserIncludes() {
    return [
        {
            model: model.userModel,
            as: 'user',
            attributes: userDetailAttributes,
            required: false,
            include: [
                {
                    model: model.employeeModel,
                    as: 'employee',
                    attributes: employeeDetailAttributes,
                    required: false,
                },
            ],
        },
    ];
}

function groupStudentIncludes() {
    return [
        {
            model: model.studentModel,
            as: 'student',
            attributes: studentDetailAttributes,
            required: false,
        },
    ];
}

function scopeDetailInclude() {
    return {
        model: model.academicGroupScopeModel,
        as: 'scope',
        attributes: scopeListAttributes,
        required: true,
        where: buildScope(model.academicGroupScopeModel),
        include: scopeNameIncludes(),
    };
}

function groupUsersPrintInclude(options = {}) {
    return {
        model: model.academicGroupUserModel,
        as: 'users',
        attributes: userListAttributes,
        required: false,
        where: buildScope(model.academicGroupUserModel),
        separate: options.separate === true,
        include: groupUserIncludes(),
    };
}

function groupStudentsPrintInclude(options = {}) {
    return {
        model: model.academicGroupStudentModel,
        as: 'students',
        attributes: studentListAttributes,
        required: false,
        where: buildScope(model.academicGroupStudentModel),
        separate: options.separate === true,
        include: groupStudentIncludes(),
    };
}

export async function createScope(payload, transaction) {
    return scoped(model.academicGroupScopeModel).create(payload, { transaction });
}

export async function getScopeById(academicGroupScopeId) {
    const scope = await scoped(model.academicGroupScopeModel).findOne({
        where: { academicGroupScopeId: Number(academicGroupScopeId) },
        attributes: scopeListAttributes,
        include: [
            ...scopeNameIncludes(),
            {
                model: model.academicGroupModel,
                as: 'groups',
                attributes: groupListAttributes,
                required: false,
                where: buildScope(model.academicGroupModel),
                include: [
                    groupUsersPrintInclude({ separate: true }),
                    groupStudentsPrintInclude({ separate: true }),
                ],
            },
        ],
    });

    if (!scope) {
        return null;
    }

    const plain = scope.get({ plain: true });

    if (plain.groups && Array.isArray(plain.groups)) {
        plain.groups = plain.groups.map((group) => {
            const users = group.users || [];
            const students = group.students || [];

            return {
                ...group,
                studentCount: students.length,
                facultyCount: users.length,
            };
        });
    }

    return plain;
}

/** Full scope list with course / session / subject names and linked groups. */
export async function getAllScopes({ search } = {}) {
    const where = {};
    if (search) {
        where.title = { [Op.like]: `%${search}%` };
    }

    const scopes = await scoped(model.academicGroupScopeModel).findAll({
        where,
        attributes: scopeListAttributes,
        include: [
            ...scopeNameIncludes(),
            {
                model: model.academicGroupModel,
                as: 'groups',
                attributes: groupListAttributes,
                required: false,
                where: buildScope(model.academicGroupModel),
                include: [
                    groupUsersPrintInclude({ separate: true }),
                    groupStudentsPrintInclude({ separate: true }),
                ],
            },
        ],
        order: [['title', 'ASC'], ['academicGroupScopeId', 'ASC']],
    });

    return scopes.map((scope) => {
        const plain = scope.get({ plain: true });
        if (plain.groups && Array.isArray(plain.groups)) {
            plain.groups = plain.groups.map((group) => {
                const users = group.users || [];
                const students = group.students || [];

                return {
                    ...group,
                    studentCount: students.length,
                    facultyCount: users.length,
                };
            });
        }
        return plain;
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

export async function findGroupsByScopeId(academicGroupScopeId, transaction) {
    return scoped(model.academicGroupModel).findAll({
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
        include: [scopeDetailInclude(), groupUsersPrintInclude(), groupStudentsPrintInclude()],
    });
}

/** Group + scope only (no users/students). For pickers and write guards. */
export async function getGroupWithScope(academicGroupId) {
    return scoped(model.academicGroupModel).findOne({
        where: { academicGroupId: Number(academicGroupId) },
        attributes: groupListAttributes,
        include: [scopeDetailInclude()],
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

    const scopeInclude = scopeDetailInclude();
    scopeInclude.where = scopeWhere;

    return scoped(model.academicGroupModel).findAndCountAll({
        where,
        attributes: groupListAttributes,
        include: [
            scopeInclude,
            groupUsersPrintInclude({ separate: true }),
            groupStudentsPrintInclude({ separate: true }),
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

export async function getMemberStudentIds(academicGroupId) {
    const rows = await scoped(model.academicGroupStudentModel).findAll({
        where: { academicGroupId: Number(academicGroupId) },
        attributes: ['studentId'],
        raw: true,
    });
    const studentIds = [];
    for (const row of rows) {
        studentIds.push(Number(row.studentId));
    }
    return studentIds;
}

export async function getMemberUserIds(academicGroupId) {
    const rows = await scoped(model.academicGroupUserModel).findAll({
        where: { academicGroupId: Number(academicGroupId) },
        attributes: ['userId'],
        raw: true,
    });
    const userIds = [];
    for (const row of rows) {
        userIds.push(Number(row.userId));
    }
    return userIds;
}

/** userIds for students already assigned to this group (non-null student.userId). */
export async function getUserIdsForMemberStudents(academicGroupId) {
    const memberStudentIds = await getMemberStudentIds(academicGroupId);
    if (memberStudentIds.length === 0) {
        return [];
    }

    const rows = await scoped(model.studentModel).findAll({
        where: {
            studentId: { [Op.in]: memberStudentIds },
            userId: { [Op.ne]: null },
        },
        attributes: ['userId'],
        raw: true,
    });
    const userIds = [];
    for (const row of rows) {
        userIds.push(Number(row.userId));
    }
    return userIds;
}

/** studentIds whose userId is already assigned as faculty on this group. */
export async function getStudentIdsForMemberUsers(academicGroupId) {
    const memberUserIds = await getMemberUserIds(academicGroupId);
    if (memberUserIds.length === 0) {
        return [];
    }

    const rows = await scoped(model.studentModel).findAll({
        where: { userId: { [Op.in]: memberUserIds } },
        attributes: ['studentId'],
        raw: true,
    });
    const studentIds = [];
    for (const row of rows) {
        studentIds.push(Number(row.studentId));
    }
    return studentIds;
}

/**
 * Teachers available to assign: isTeacher employees, excluding already-used userIds.
 */
export async function findAvailableUsers({
    page = 1,
    limit = 10,
    search,
    campusId,
    subjectId,
    excludeUserIds,
}) {
    const employeeWhere = {};
    if (campusId != null) {
        employeeWhere.campusId = Number(campusId);
    }

    if (subjectId != null) {
        const mappingRows = await scoped(model.teacherSubjectMappingModel).findAll({
            attributes: ['userId'],
            where: { subjectId: Number(subjectId) },
            raw: true,
        });
        const mappedUserIds = [];
        for (const row of mappingRows) {
            mappedUserIds.push(Number(row.userId));
        }
        if (mappedUserIds.length === 0) {
            return { rows: [], count: 0 };
        }
        employeeWhere.userId = { [Op.in]: mappedUserIds };
    }

    if (excludeUserIds != null && excludeUserIds.length > 0) {
        const excluded = [];
        for (const id of excludeUserIds) {
            excluded.push(Number(id));
        }
        if (employeeWhere.userId != null && employeeWhere.userId[Op.in]) {
            const kept = [];
            for (const id of employeeWhere.userId[Op.in]) {
                if (!excluded.includes(Number(id))) {
                    kept.push(Number(id));
                }
            }
            if (kept.length === 0) {
                return { rows: [], count: 0 };
            }
            employeeWhere.userId = { [Op.in]: kept };
        } else {
            employeeWhere.userId = { [Op.notIn]: excluded };
        }
    }

    const userWhere = { isTeacher: true };
    if (search) {
        const like = `%${search}%`;
        employeeWhere[Op.or] = [
            { employeeName: { [Op.like]: like } },
            { employeeCode: { [Op.like]: like } },
            { '$user.userName$': { [Op.like]: like } },
            { '$user.email$': { [Op.like]: like } },
        ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    return scoped(model.employeeModel).findAndCountAll({
        where: employeeWhere,
        attributes: employeeDetailAttributes,
        include: [
            {
                model: model.userModel,
                as: 'user',
                attributes: userDetailAttributes,
                required: true,
                where: userWhere,
            },
        ],
        order: [['employeeName', 'ASC'], ['employeeId', 'ASC']],
        limit: Number(limit),
        offset,
        distinct: true,
        subQuery: false,
    });
}

/**
 * Students placed on class_sections for course+session whose class_section_term
 * matches the given terms (or all terms when terms omitted).
 * Excludes studentIds already in the academic group (caller passes exclude list).
 */
export async function resolveEligibleStudentIds({
    courseId,
    sessionId,
    terms,
    classSectionsId,
    year,
    excludeStudentIds,
}) {
    const sectionWhere = {
        courseId: Number(courseId),
        sessionId: Number(sessionId),
        ...buildScope(model.classSectionModel),
    };
    if (classSectionsId != null) {
        sectionWhere.classSectionsId = Number(classSectionsId);
    }
    if (year != null) {
        sectionWhere.year = Number(year);
    }

    const termWhere = {};
    if (terms != null && terms.length > 0) {
        if (terms.length === 1) {
            termWhere.term = Number(terms[0]);
        } else {
            const termList = [];
            for (const t of terms) {
                termList.push(Number(t));
            }
            termWhere.term = { [Op.in]: termList };
        }
    }

    const termRows = await scoped(model.classSectionTermModel).findAll({
        attributes: ['classSectionTermId', 'classSectionsId', 'term'],
        where: termWhere,
        include: [
            {
                model: model.classSectionModel,
                as: 'classSection',
                attributes: ['classSectionsId'],
                required: true,
                where: sectionWhere,
            },
        ],
    });

    const classSectionTermIds = [];
    const classSectionsIds = [];
    const seenSection = new Set();
    for (const row of termRows) {
        classSectionTermIds.push(Number(row.classSectionTermId));
        const sectionId = Number(row.classSectionsId);
        if (!seenSection.has(sectionId)) {
            seenSection.add(sectionId);
            classSectionsIds.push(sectionId);
        }
    }

    if (classSectionTermIds.length === 0) {
        return [];
    }

    const historyRows = await model.studentClassSectionsHistoryModel.findAll({
        attributes: ['studentId'],
        where: {
            status: 'current',
            classSectionsId: { [Op.in]: classSectionsIds },
            classSectionTermId: { [Op.in]: classSectionTermIds },
        },
        raw: true,
    });

    const currentHistoryRows = await model.studentClassSectionsHistoryModel.findAll({
        attributes: ['studentId'],
        where: { status: 'current' },
        raw: true,
    });
    const studentsWithCurrentHistory = new Set();
    for (const row of currentHistoryRows) {
        studentsWithCurrentHistory.add(Number(row.studentId));
    }

    const fkRows = await scoped(model.studentModel).findAll({
        attributes: ['studentId'],
        where: {
            courseId: Number(courseId),
            sessionId: Number(sessionId),
            classSectionTermId: { [Op.in]: classSectionTermIds },
        },
        raw: true,
    });

    const eligible = [];
    const seen = new Set();
    const excludeSet = new Set();
    if (excludeStudentIds != null) {
        for (const id of excludeStudentIds) {
            excludeSet.add(Number(id));
        }
    }

    for (const row of historyRows) {
        const id = Number(row.studentId);
        if (seen.has(id) || excludeSet.has(id)) {
            continue;
        }
        seen.add(id);
        eligible.push(id);
    }

    for (const row of fkRows) {
        const id = Number(row.studentId);
        if (studentsWithCurrentHistory.has(id) || seen.has(id) || excludeSet.has(id)) {
            continue;
        }
        seen.add(id);
        eligible.push(id);
    }

    return eligible;
}

/** Active + soft-deleted memberships for constraint checks / restore. */
export async function findGroupStudentsIncludingDeleted(academicGroupId, studentIds, transaction) {
    return model.academicGroupStudentModel.findAll({
        where: {
            academicGroupId: Number(academicGroupId),
            studentId: { [Op.in]: studentIds },
            ...buildScope(model.academicGroupStudentModel),
        },
        attributes: ['academicGroupStudentId', 'studentId', 'deletedAt'],
        paranoid: false,
        transaction,
    });
}

export async function restoreGroupStudent(academicGroupStudentId, updatedBy, transaction) {
    await model.academicGroupStudentModel.restore({
        where: {
            academicGroupStudentId: Number(academicGroupStudentId),
            ...buildScope(model.academicGroupStudentModel),
        },
        transaction,
    });
    await model.academicGroupStudentModel.update(
        { updatedBy },
        {
            where: { academicGroupStudentId: Number(academicGroupStudentId) },
            transaction,
        },
    );
    return scoped(model.academicGroupStudentModel).findOne({
        where: { academicGroupStudentId: Number(academicGroupStudentId) },
        attributes: studentListAttributes,
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

/** Active + soft-deleted faculty rows for constraint checks / restore. */
export async function findGroupUsersIncludingDeleted(academicGroupId, userIds, transaction) {
    return model.academicGroupUserModel.findAll({
        where: {
            academicGroupId: Number(academicGroupId),
            userId: { [Op.in]: userIds },
            ...buildScope(model.academicGroupUserModel),
        },
        attributes: ['academicGroupUserId', 'userId', 'role', 'deletedAt'],
        paranoid: false,
        transaction,
    });
}

export async function restoreGroupUser(academicGroupUserId, payload, transaction) {
    await model.academicGroupUserModel.restore({
        where: {
            academicGroupUserId: Number(academicGroupUserId),
            ...buildScope(model.academicGroupUserModel),
        },
        transaction,
    });
    await model.academicGroupUserModel.update(
        payload,
        {
            where: { academicGroupUserId: Number(academicGroupUserId) },
            transaction,
        },
    );
    return scoped(model.academicGroupUserModel).findOne({
        where: { academicGroupUserId: Number(academicGroupUserId) },
        attributes: userListAttributes,
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

/** Faculty list for a group with user + employee details. */
export async function getGroupUsersByAcademicGroupId(academicGroupId) {
    return scoped(model.academicGroupUserModel).findAll({
        where: { academicGroupId: Number(academicGroupId) },
        attributes: userListAttributes,
        include: groupUserIncludes(),
        order: [['academicGroupUserId', 'ASC']],
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

export async function studentExistsInScope(studentId, { courseId, sessionId } = {}) {
    const where = { studentId: Number(studentId) };
    if (courseId != null) {
        where.courseId = Number(courseId);
    }
    if (sessionId != null) {
        where.sessionId = Number(sessionId);
    }
    return scoped(model.studentModel).findOne({
        where,
        attributes: ['studentId', 'courseId', 'sessionId'],
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
