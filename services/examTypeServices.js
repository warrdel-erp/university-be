import * as examTypeRepository from "../repository/examTypeRepository.js";

export async function addExamType(examDetail, user) {
    examDetail.createdBy = user?.userId;
    examDetail.updatedBy = user?.userId;
    examDetail.academicYearId = user?.academicYearId || examDetail.academicYearId;
    examDetail.instituteId = user?.instituteId || examDetail.instituteId;
    examDetail.universityId = user?.universityId || examDetail.universityId;

    return await examTypeRepository.addExamType(examDetail);
};

export async function getExamType(academicYearId, user) {
    const yearId = academicYearId || user?.academicYearId;
    return await examTypeRepository.getExamType(yearId);
}

export async function getSingleExamType(examTypeId) {
    return await examTypeRepository.getSingleExamType(examTypeId);
}

export async function deleteExamType(examTypeId) {
    return await examTypeRepository.deleteExamType(examTypeId);
}

export async function updateExamType(examTypeId, examDetail, user) {
    examDetail.updatedBy = user?.userId;
    if (user?.academicYearId) examDetail.academicYearId = user.academicYearId;
    if (user?.instituteId) examDetail.instituteId = user.instituteId;
    if (user?.universityId) examDetail.universityId = user.universityId;

    return await examTypeRepository.updateExamType(examTypeId, examDetail);
}
