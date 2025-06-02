import * as examTypeRepository from "../repository/examTypeRepository.js";

export async function addExamType(examDetail, createdBy, updatedBy,universityId,instituteId) {

    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    examDetail.universityId = universityId;
    examDetail.instituteId = instituteId;
    const DormitoryList = await examTypeRepository.addExamType(examDetail);
    return DormitoryList;
};

export async function getExamType(universityId,acedmicYearId,role,instituteId) {
    return await examTypeRepository.getExamType(universityId,acedmicYearId,role,instituteId);
}

export async function getSingleExamType(examTypeId, universityId) {
    return await examTypeRepository.getSingleExamType(examTypeId, universityId);
}

export async function deleteExamType(examTypeId) {
    return await examTypeRepository.deleteExamType(examTypeId);
}

export async function updateExamType(examTypeId, examDetail, updatedBy) {

    examDetail.updatedBy = updatedBy;
    await examTypeRepository.updateExamType(examTypeId, examDetail);
}