import * as optionsRepository from '../repository/optionsRepository.js';
import * as model from '../models/index.js';

export async function getAffiliatedUniversityOptions(instituteId) {
    return await optionsRepository.getAffiliatedUniversityOptions(instituteId);
}

export async function getCourseOptions(universityId, instituteId) {
    return await optionsRepository.getCourseOptions(universityId, instituteId);
}

export async function getTermOptions(courseId) {
    const course = await optionsRepository.getCourseData(courseId);
    if (!course) return [];

    const { totalTerms, termType } = course;
    const options = [];
    for (let i = 1; i <= totalTerms; i++) {
        options.push({
            label: `${termType} ${i}`,
            value: i
        });
    }
    return options;
}

export async function getClassSectionOptions(courseId, term) {
    return await optionsRepository.getClassSectionOptions(courseId, term);
}

export async function getSpecializationOptions(courseId, instituteId, universityId) {
    return await optionsRepository.getSpecializationOptions(courseId, instituteId, universityId);
}

export async function getSubjectOptions(courseId, term, universityId, acedmicYearId, sessionId, instituteId) {
    let resolvedAcademicYearId = acedmicYearId;

    if (sessionId) {
        const session = await model.sessionModel.findOne({
            where: { sessionId, universityId },
            attributes: ["acedmicYearId"],
        });
        if (!session) {
            throw new Error("Session not found");
        }
        resolvedAcademicYearId = session.acedmicYearId;

        if (courseId) {
            const mapping = await optionsRepository.findSessionCourseMappingByCourseAndSession(
                Number(courseId),
                Number(sessionId),
                instituteId
            );
            if (!mapping) {
                throw new Error("Session is not mapped to this course");
            }
        }
    }

    return await optionsRepository.getSubjectOptions(
        courseId,
        term,
        universityId,
        resolvedAcademicYearId,
        instituteId
    );
}

export async function getTeacherOptions(instituteId, campusId) {
    return await optionsRepository.getTeacherOptions(instituteId, campusId);
}

export async function getFeePlanOptions(filters) {
    const empty = { courseSessionId: null, profiles: [] };
    const { courseId, sessionId, instituteId } = filters;
    if (!courseId || !sessionId || !instituteId) {
        return empty;
    }

    const { courseSessionId, rows } = await optionsRepository.getFeePlanProfileOptions(
        Number(courseId),
        Number(sessionId),
        instituteId
    );

    return {
        courseSessionId,
        profiles: rows.map((row) => ({
            feePlanProfileId: row.feePlanProfileId,
            name: row.name,
        })),
    };
}

export async function getTopicOptions(filters) {
    return await optionsRepository.getTopicOptions(filters);
}



