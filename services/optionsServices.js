import * as optionsRepository from '../repository/optionsRepository.js';
import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function getAffiliatedUniversityOptions() {
    return await optionsRepository.getAffiliatedUniversityOptions();
}

export async function getCourseOptions() {
    return await optionsRepository.getCourseOptions();
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

export async function getClassSectionOptions(courseId, term, sessionId) {
    return await optionsRepository.getClassSectionOptions(courseId, term, sessionId);
}

export async function getSpecializationOptions(courseId) {
    return await optionsRepository.getSpecializationOptions(courseId);
}

export async function getSubjectOptions(courseId, term, academicYearId, sessionId) {
    let resolvedAcademicYearId = academicYearId;

    if (sessionId) {
        const session = await scoped(model.sessionModel).findOne({
            where: { sessionId },
            attributes: ["academicYearId"],
        });
        if (!session) {
            throw new Error("Session not found");
        }
        resolvedAcademicYearId = session.academicYearId;

        if (courseId) {
            const mapping = await optionsRepository.findSessionCourseMappingByCourseAndSession(
                Number(courseId),
                Number(sessionId),
            );
            if (!mapping) {
                throw new Error("Session is not mapped to this course");
            }
        }
    }

    return await optionsRepository.getSubjectOptions(
        courseId,
        term,
        resolvedAcademicYearId,
    );
}

export async function getTeacherOptions(campusId) {
    return await optionsRepository.getTeacherOptions(campusId);
}

export async function getFeePlanOptions(filters) {
    const empty = { courseSessionId: null, profiles: [] };
    const { courseId, sessionId } = filters;
    if (!courseId || !sessionId) {
        return empty;
    }

    const { courseSessionId, rows } = await optionsRepository.getFeePlanProfileOptions(
        Number(courseId),
        Number(sessionId),
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
