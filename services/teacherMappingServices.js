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
        results.push(await teacherSubjectMapping({ userId: data.userId, subjectId, createdBy }));
    }
    return results;
}

export async function teacherSectionMappingService(data, createdBy) {
    const results = [];
    for (const classSectionsId of [].concat(data.classSectionsId ?? [])) {
        results.push(await teacherSectionMapping({ userId: data.userId, classSectionsId, createdBy }));
    }
    return results;
}

export async function saveOrUpdateTeacherSubjectMapping(list, userId) {
    const results = [];

    for (const item of list) {
        const { teacherSubjectMappingId, userId, subjectId } = item;

        if (teacherSubjectMappingId) {
            const updated = await updateTeachersSubjectMapping(teacherSubjectMappingId, {
                userId,
                ...(subjectId != null && { subjectId }),
            });

            results.push({
                action: "updated",
                teacherSubjectMappingId,
                result: updated,
            });
        } else {
            const created = await teacherSubjectMapping({
                userId,
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
            userId: data.userId,
            classSectionsId,
        }));
    }
    return results;
}

export { deleteTeachersSectionMapping as deleteTeacherSectionMapping, deleteTeachersSubjectMapping as deleteTeacherSubjectMapping };
