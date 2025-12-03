import * as InternalAssessmentRepository from "../repository/internalAssessmentRepository.js";

export async function addInternalAssessment(examDetail, createdBy, updatedBy) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    const result = await InternalAssessmentRepository.addInternalAssessment(examDetail);
    return result;
}

export async function getInternalAssessment(universityId,acedmicYearId,role,instituteId) {
    return await InternalAssessmentRepository.getInternalAssessment(universityId,acedmicYearId,role,instituteId);
}

export async function getSingleInternalAssessment(InternalAssessmentId, universityId) {
    return await InternalAssessmentRepository.getSingleInternalAssessment(InternalAssessmentId, universityId);
}

export async function deleteInternalAssessment(InternalAssessmentId) {
    return await InternalAssessmentRepository.deleteInternalAssessment(InternalAssessmentId);
}

export async function updateInternalAssessment(InternalAssessmentId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await InternalAssessmentRepository.updateInternalAssessment(InternalAssessmentId, examDetail);
}