import {
    teacherSubjectMapping,
    getTeacherSubjectMapping,
    updateTeachersSubjectMapping,
    deleteTeachersSubjectMapping,
} from "../repository/teacherSubjectMappingRepository.js";
import {
    teacherSectionMapping,
    getTeacherSectionMapping,
    updateTeachersSectionMapping,
    deleteTeachersSectionMapping,
} from "../repository/teacherSectionMappingRepository.js";

export { getTeacherSubjectMapping, getTeacherSectionMapping };

export async function teacherSubjectMappingService(data, createdBy) {
    const results = [];
    const subjectIds = [...new Set([].concat(data.subjectId ?? []).map(Number).filter(Boolean))];

    for (const subjectId of subjectIds) {
        results.push(await teacherSubjectMapping({ employeeId: data.employeeId, subjectId, createdBy }));
    }
    return results;
}

export async function teacherSectionMappingService(data, createdBy) {
    const results = [];
    for (const classSectionsId of [].concat(data.classSectionsId ?? [])) {
        results.push(await teacherSectionMapping({ employeeId: data.employeeId, classSectionsId, createdBy }));
    }
    return results;
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
    const results = [];
    for (const classSectionsId of [].concat(data.classSectionsId ?? [])) {
        results.push(await updateTeachersSectionMapping(teacherSectionMappingId, {
            employeeId: data.employeeId,
            classSectionsId,
        }));
    }
    return results;
}

export { deleteTeachersSectionMapping as deleteTeacherSectionMapping, deleteTeachersSubjectMapping as deleteTeacherSubjectMapping };
