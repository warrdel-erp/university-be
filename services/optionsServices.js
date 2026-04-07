import * as optionsRepository from '../repository/optionsRepository.js';

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

export async function getSubjectOptions(courseId, term, universityId, acedmicYearId) {
    return await optionsRepository.getSubjectOptions(courseId, term, universityId, acedmicYearId);
}

export async function getTeacherOptions(instituteId, campusId) {
    return await optionsRepository.getTeacherOptions(instituteId, campusId);
}

