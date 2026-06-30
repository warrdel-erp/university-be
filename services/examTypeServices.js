import * as examTypeRepository from "../repository/examTypeRepository.js";

export async function addExamType(examDetail, createdBy, updatedBy) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    return await examTypeRepository.addExamType(examDetail);
};

export async function getExamType(academicYearId) {
    return await examTypeRepository.getExamType(academicYearId);
}

export async function getSingleExamType(examTypeId) {
    return await examTypeRepository.getSingleExamType(examTypeId);
}

export async function deleteExamType(examTypeId) {
    return await examTypeRepository.deleteExamType(examTypeId);
}

export async function updateExamType(examTypeId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examTypeRepository.updateExamType(examTypeId, examDetail);
}
