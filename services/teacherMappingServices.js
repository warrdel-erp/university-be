import * as teacherSubjectMappingRepository from "../repository/teacherSubjectMappingRepository.js";
import {
    teacherSectionMapping,
    getTeacherSectionMapping,
    updateTeachersSectionMapping,
    deleteTeachersSectionMapping,
} from "../repository/teacherSectionMappingRepository.js";
import { getAcademicYearId } from "../utility/requestContext.js";

export { getTeacherSectionMapping };

const SUBJECT_SOURCE_STATUS = {
    MAPPING: "teacherSubjectMapping",
    TIMETABLE: "timeTableCellDateWise",
    BOTH: "both",
};

function emptyPage(page, limit) {
    return {
        result: [],
        totalCount: 0,
        page,
        limit,
        totalPages: 0,
    };
}

function toPlain(row) {
    return row.get ? row.get({ plain: true }) : row;
}

function uniqueUserIds(...lists) {
    const ids = [];
    const seen = new Set();
    for (const list of lists) {
        for (const raw of list || []) {
            const id = Number(raw);
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            ids.push(id);
        }
    }
    return ids;
}

function subjectAllowed(subjectId, filterSubjectId, filterSubjectIds) {
    if (filterSubjectId != null && Number(subjectId) !== Number(filterSubjectId)) {
        return false;
    }
    if (filterSubjectIds == null) {
        return true;
    }
    for (const id of filterSubjectIds) {
        if (Number(id) === Number(subjectId)) {
            return true;
        }
    }
    return false;
}

function resolveDateWiseSubject(plain) {
    const cell = plain.timeTableCell || {};
    if (cell.timeTableSubject && cell.timeTableSubject.subjectId) {
        return cell.timeTableSubject;
    }
    if (
        cell.timeTableTeacherSubject
        && cell.timeTableTeacherSubject.employeeSubject
        && cell.timeTableTeacherSubject.employeeSubject.subjectId
    ) {
        return cell.timeTableTeacherSubject.employeeSubject;
    }
    return null;
}

function mergeSubjectStatus(existing, incoming, source) {
    if (!existing) {
        return { ...incoming, status: source };
    }
    if (existing.status === source || existing.status === SUBJECT_SOURCE_STATUS.BOTH) {
        return existing;
    }
    return { ...existing, status: SUBJECT_SOURCE_STATUS.BOTH };
}

function getCourseBucket(groupsByUser, userId, courseId) {
    if (!groupsByUser.has(userId)) {
        groupsByUser.set(userId, { createdBy: null, courses: new Map() });
    }
    const group = groupsByUser.get(userId);
    if (!group.courses.has(courseId)) {
        group.courses.set(courseId, new Map());
    }
    return group;
}

function putSubject(groupsByUser, userId, subject, source, extra = {}) {
    const courseId = subject.courseId ?? "none";
    const group = getCourseBucket(groupsByUser, userId, courseId);
    const subjectMap = group.courses.get(courseId);
    const key = Number(subject.subjectId);
    const existing = subjectMap.get(key);

    subjectMap.set(
        key,
        mergeSubjectStatus(
            existing,
            {
                ...subject,
                teacherSubjectMappingId:
                    extra.teacherSubjectMappingId != null
                        ? extra.teacherSubjectMappingId
                        : (existing ? existing.teacherSubjectMappingId : null),
                termType: subject.courseInfo ? subject.courseInfo.termType : null,
            },
            source,
        ),
    );
}

// --- modular blocks ---

async function resolveFilterSubjectIds(sessionId) {
    const academicYearId = getAcademicYearId();
    if (academicYearId == null && sessionId == null) {
        return { academicYearId, subjectIds: null };
    }
    const subjectIds = await teacherSubjectMappingRepository.resolveSubjectIdsForTeacherFilters({
        academicYearId,
        sessionId,
    });
    return { academicYearId, subjectIds };
}

async function collectTeacherUserIds({ userId, subjectId, subjectIds, academicYearId }) {
    const [mappedUserIds, roleTeacherUserIds] = await Promise.all([
        teacherSubjectMappingRepository.findMappedTeacherUserIds({
            userId,
            subjectId,
            subjectIds,
            academicYearId,
        }),
        teacherSubjectMappingRepository.findRoleTeacherUserIds(userId),
    ]);
    return uniqueUserIds(mappedUserIds, roleTeacherUserIds);
}

async function loadDateWisePairs({
    userId,
    teacherUserIds,
    subjectId,
    subjectIds,
    sessionId,
    academicYearId,
}) {
    const rows = await teacherSubjectMappingRepository.findDateWiseTeacherSubjectRows({
        userId,
        userIds: userId == null ? null : teacherUserIds,
        subjectId,
        subjectIds,
        sessionId,
        academicYearId,
    });

    const pairs = [];
    for (const row of rows) {
        const plain = toPlain(row);
        const subject = resolveDateWiseSubject(plain);
        if (!subject || !subject.subjectId) {
            continue;
        }
        if (!subjectAllowed(subject.subjectId, subjectId, subjectIds)) {
            continue;
        }

        const teachers = plain.timeTableCellTeachersDateWise || [];
        for (const teacher of teachers) {
            const teacherUserId = Number(teacher.userId);
            if (!teacherUserId) {
                continue;
            }
            if (userId != null && teacherUserId !== Number(userId)) {
                continue;
            }
            pairs.push({ userId: teacherUserId, subject });
        }
    }
    return pairs;
}

function applyMappingRows(groupsByUser, mappingRows) {
    for (const row of mappingRows) {
        const plain = toPlain(row);
        const subject = plain.employeeSubject;
        if (!subject || !subject.subjectId) {
            continue;
        }

        const userId = Number(plain.userId);
        const group = getCourseBucket(groupsByUser, userId, subject.courseId ?? "none");
        if (group.createdBy == null) {
            group.createdBy = plain.createdBy;
        }

        putSubject(
            groupsByUser,
            userId,
            subject,
            SUBJECT_SOURCE_STATUS.MAPPING,
            { teacherSubjectMappingId: plain.teacherSubjectMappingId },
        );
    }
}

function applyDateWisePairs(groupsByUser, dateWisePairs) {
    for (const pair of dateWisePairs) {
        putSubject(
            groupsByUser,
            Number(pair.userId),
            pair.subject,
            SUBJECT_SOURCE_STATUS.TIMETABLE,
        );
    }
}

function buildTeacherGroups(teachers, groupsByUser) {
    const grouped = [];

    for (const teacher of teachers) {
        const plainTeacher = toPlain(teacher);
        const userId = Number(plainTeacher.userId);
        const group = groupsByUser.get(userId);

        if (!group || group.courses.size === 0) {
            grouped.push({
                userId,
                teacherEmployeeData: plainTeacher,
                employeeSubject: [],
            });
            continue;
        }

        for (const subjectMap of group.courses.values()) {
            const subjects = [];
            for (const subject of subjectMap.values()) {
                subjects.push(subject);
            }
            grouped.push({
                userId,
                createdBy: group.createdBy,
                teacherEmployeeData: plainTeacher,
                employeeSubject: subjects,
            });
        }
    }

    return grouped;
}

function matchesSearch(row, term) {
    const emp = row.teacherEmployeeData;
    if (emp && emp.employeeName && emp.employeeName.toLowerCase().includes(term)) {
        return true;
    }

    for (const sub of row.employeeSubject || []) {
        if (String(sub.term ?? "").includes(term)) {
            return true;
        }
        if (sub.subjectName && sub.subjectName.toLowerCase().includes(term)) {
            return true;
        }
        if (
            sub.courseInfo
            && sub.courseInfo.courseName
            && sub.courseInfo.courseName.toLowerCase().includes(term)
        ) {
            return true;
        }
    }
    return false;
}

function applySearch(rows, search) {
    const term = search ? search.trim().toLowerCase() : "";
    if (!term) {
        return rows;
    }

    const filtered = [];
    for (const row of rows) {
        if (matchesSearch(row, term)) {
            filtered.push(row);
        }
    }
    return filtered;
}

function paginate(rows, page, limit) {
    const totalCount = rows.length;
    const offset = (page - 1) * limit;
    return {
        result: rows.slice(offset, offset + limit),
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 0,
    };
}

/**
 * GET teacher subjects from:
 * 1) teacherSubjectMapping
 * 2) timeTableCellDateWise
 * status: teacherSubjectMapping | timeTableCellDateWise | both
 */
export async function getTeacherSubjectMapping({
    userId,
    subjectId,
    sessionId,
    search,
    page = 1,
    limit = 20,
} = {}) {
    try {
        const { academicYearId, subjectIds } = await resolveFilterSubjectIds(sessionId);

        let teacherUserIds = await collectTeacherUserIds({
            userId,
            subjectId,
            subjectIds,
            academicYearId,
        });

        const dateWisePairs = await loadDateWisePairs({
            userId,
            teacherUserIds,
            subjectId,
            subjectIds,
            sessionId,
            academicYearId,
        });

        const dateWiseUserIds = [];
        for (const pair of dateWisePairs) {
            dateWiseUserIds.push(pair.userId);
        }
        teacherUserIds = uniqueUserIds(teacherUserIds, dateWiseUserIds);

        if (!teacherUserIds.length) {
            return emptyPage(page, limit);
        }

        const [teachers, mappingRows] = await Promise.all([
            teacherSubjectMappingRepository.findEmployeesByUserIds(teacherUserIds),
            teacherSubjectMappingRepository.findTeacherSubjectMappingRows({
                userIds: teacherUserIds,
                subjectId,
                subjectIds,
                academicYearId,
            }),
        ]);

        if (!teachers.length) {
            return emptyPage(page, limit);
        }

        const groupsByUser = new Map();
        applyMappingRows(groupsByUser, mappingRows);
        applyDateWisePairs(groupsByUser, dateWisePairs);

        const grouped = buildTeacherGroups(teachers, groupsByUser);
        const filtered = applySearch(grouped, search);
        return paginate(filtered, page, limit);
    } catch (error) {
        throw new Error(`Failed to fetch teacher subject mapping: ${error.message}`);
    }
}

export async function teacherSubjectMappingService(data, createdBy) {
    const results = [];
    const subjectIds = uniqueUserIds([].concat(data.subjectId ?? []));

    for (const subjectId of subjectIds) {
        results.push(
            await teacherSubjectMappingRepository.teacherSubjectMapping({
                userId: data.userId,
                subjectId,
                createdBy,
            }),
        );
    }
    return results;
}

export async function teacherSectionMappingService(data, createdBy) {
    const results = [];
    for (const classSectionsId of [].concat(data.classSectionsId ?? [])) {
        results.push(
            await teacherSectionMapping({
                userId: data.userId,
                classSectionsId,
                createdBy,
            }),
        );
    }
    return results;
}

export async function saveOrUpdateTeacherSubjectMapping(list, userId) {
    const results = [];

    for (const item of list) {
        const { teacherSubjectMappingId, userId: itemUserId, subjectId } = item;

        if (teacherSubjectMappingId) {
            const updated = await teacherSubjectMappingRepository.updateTeachersSubjectMapping(
                teacherSubjectMappingId,
                {
                    userId: itemUserId,
                    ...(subjectId != null && { subjectId }),
                },
            );
            results.push({
                action: "updated",
                teacherSubjectMappingId,
                result: updated,
            });
            continue;
        }

        const created = await teacherSubjectMappingRepository.teacherSubjectMapping({
            userId: itemUserId,
            subjectId,
            createdBy: userId,
        });
        results.push({
            action: "created",
            teacherSubjectMappingId: created.teacherSubjectMappingId,
            result: created,
        });
    }

    return results;
}

export async function updateTeacherSectionMapping(data, teacherSectionMappingId) {
    const results = [];
    for (const classSectionsId of [].concat(data.classSectionsId ?? [])) {
        results.push(
            await updateTeachersSectionMapping(teacherSectionMappingId, {
                userId: data.userId,
                classSectionsId,
            }),
        );
    }
    return results;
}

export { deleteTeachersSectionMapping as deleteTeacherSectionMapping };

export async function deleteTeacherSubjectMapping(teacherSubjectMappingId) {
    return teacherSubjectMappingRepository.deleteTeachersSubjectMapping(teacherSubjectMappingId);
}
