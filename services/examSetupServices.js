import * as examSetupRepository from "../repository/examSetupRepository.js";

export async function addExamSetup(examDetail, createdBy, updatedBy) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    const result = await examSetupRepository.addExamSetup(examDetail);
    return result;
}

export async function getExamSetup(universityId,acedmicYearId) {
    return await examSetupRepository.getExamSetup(universityId,acedmicYearId);
}

export async function getSingleExamSetup(examSetupId, universityId) {
    return await examSetupRepository.getSingleExamSetup(examSetupId, universityId);
}

export async function deleteExamSetup(examSetupId) {
    return await examSetupRepository.deleteExamSetup(examSetupId);
}

export async function updateExamSetup(examSetupId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examSetupRepository.updateExamSetup(examSetupId, examDetail);
}
