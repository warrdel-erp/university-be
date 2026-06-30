import * as examSetupRepository from "../repository/examSetupRepository.js";

export async function addExamSetup(examDetail, createdBy, updatedBy) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    return await examSetupRepository.addExamSetup(examDetail);
}

export async function getExamSetup(academicYearId) {
    return await examSetupRepository.getExamSetup(academicYearId);
}

export async function getSingleExamSetup(examSetupId) {
    return await examSetupRepository.getSingleExamSetup(examSetupId);
}

export async function deleteExamSetup(examSetupId) {
    return await examSetupRepository.deleteExamSetup(examSetupId);
}

export async function updateExamSetup(examSetupId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examSetupRepository.updateExamSetup(examSetupId, examDetail);
}
