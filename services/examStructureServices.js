import * as examStructureRepository from "../repository/examStructureRepository.js";

export async function addExamStructure(examDetail, createdBy, updatedBy,universityId,instituteId) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    examDetail.universityId = universityId;
    examDetail.instituteId = instituteId;
    const result = await examStructureRepository.addExamStructure(examDetail);
    return result;
}

export async function getExamStructure(universityId,acedmicYearId,role,instituteId) {
    return await examStructureRepository.getExamStructure(universityId,acedmicYearId,role,instituteId);
}

export async function getSingleExamStructure(examStructureId, universityId) {
    return await examStructureRepository.getSingleExamStructure(examStructureId, universityId);
}

export async function deleteExamStructure(examStructureId) {
    return await examStructureRepository.deleteExamStructure(examStructureId);
}

export async function updateExamStructure(examStructureId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureRepository.updateExamStructure(examStructureId, examDetail);
}
