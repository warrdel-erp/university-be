import {
    teacherSubjectMapping,
    getTeacherSubjectMapping,
    updateTeachersSubjectMapping,
    deleteTeachersSubjectMapping,
    resolveSubjectIdsForTeacherFilters,
} from "../repository/teacherSubjectMappingRepository.js";
import {
    teacherSectionMapping,
    getTeacherSectionMapping,
    updateTeachersSectionMapping,
    deleteTeachersSectionMapping,
} from "../repository/teacherSectionMappingRepository.js";
import { requestContext } from "../utility/requestContext.js";

function normalizeIdList(value) {
    if (value == null) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

function resolveQueryAcademicYearId(acedmicYearId) {
    if (acedmicYearId == null || acedmicYearId === '') {
        return undefined;
    }
    const parsed = Number(acedmicYearId);
    return Number.isNaN(parsed) ? undefined : parsed;
}

export async function teacherSubjectMappingService(data, createdBy) {
    try {
        const { employeeId } = data;
        const subjectIds = normalizeIdList(data.subjectId);
        if (!subjectIds.length) {
            throw new Error('subjectId is required');
        }

        const results = [];
        for (const subjectId of subjectIds) {
            const result = await teacherSubjectMapping({ employeeId, subjectId, createdBy });
            results.push(result);
        }

        return results;
    } catch (error) {
        console.error('Error in teacher Subject Mapping:', error);
        throw error;
    }
}

export async function teacherSectionMappingService(data, createdBy) {
    try {
        const { employeeId, classSectionsId } = data;
        const results = [];

        for (const id of classSectionsId) {
            const entryData = { employeeId, classSectionsId: id, createdBy };
            const result = await teacherSectionMapping(entryData);
            results.push(result);
        }

        return results;
    } catch (error) {
        console.error('Error in teacher Section Mapping:', error);
        throw error;
    }
}

export async function getTeacherSubjectMappingService(employeeId, subjectId, sessionId, acedmicYearId) {
    const yearId = resolveQueryAcademicYearId(acedmicYearId);
    const parsedSessionId = sessionId != null && sessionId !== '' ? Number(sessionId) : undefined;
    const subjectIds = await resolveSubjectIdsForTeacherFilters({
        acedmicYearId: yearId,
        sessionId: parsedSessionId,
    });
    return getTeacherSubjectMapping(employeeId, subjectId, yearId, subjectIds);
}

export async function getTeacherSectionMappingService(filters) {
    const yearId = resolveQueryAcademicYearId(filters.acedmicYearId);
    const subjectIds = yearId != null
        ? await findSubjectIdsForYear(yearId)
        : null;
    return getTeacherSectionMapping({ ...filters, yearId, subjectIds });
}

export async function saveOrUpdateTeacherSubjectMapping(list, userId) {
    const results = [];

    for (const item of list) {
        const { teacherSubjectMappingId, employeeId, subjectId } = item;

        if (teacherSubjectMappingId) {
            const updated = await updateTeachersSubjectMapping(teacherSubjectMappingId, {
                employeeId,
                ...(subjectId != null && { subjectId }),
            });

            results.push({
                action: "updated",
                teacherSubjectMappingId,
                result: updated,
            });
        } else {
            const created = await teacherSubjectMapping({
                employeeId,
                subjectId,
                createdBy: userId,
            });

            results.push({
                action: "created",
                teacherSubjectMappingId: created.teacherSubjectMappingId,
                result: created,
            });
        }
    }

    return results;
}

export async function updateTeacherSectionMapping(data, teacherSectionMappingId) {
    const { employeeId, classSectionsId } = data;
    const results = [];

    for (const id of classSectionsId) {
        const entryData = { employeeId, classSectionsId: id };
        const result = await updateTeachersSectionMapping(teacherSectionMappingId, entryData);
        results.push(result);
    }
    return results;
}

export async function deleteTeacherSectionMapping(teacherSectionMappingId) {
    return deleteTeachersSectionMapping(teacherSectionMappingId);
}

export async function deleteTeacherSubjectMapping(teacherSubjectMappingId) {
    return deleteTeachersSubjectMapping(teacherSubjectMappingId);
}
