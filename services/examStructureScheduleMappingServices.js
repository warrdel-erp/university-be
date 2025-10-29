import * as examStructureScheduleRepository from "../repository/examStructureScheduleMappingRepository.js";

export async function addExamStructureSchedule(examScheduleDetail, createdBy, updatedBy,universityId,instituteId) {
    examScheduleDetail.createdBy = createdBy;
    examScheduleDetail.updatedBy = updatedBy;
    examScheduleDetail.universityId = universityId;
    examScheduleDetail.instituteId = instituteId;
    const result = await examStructureScheduleRepository.addExamStructureSchedule(examScheduleDetail);
    return result;
};

export async function getExamStructureSchedule(universityId,acedmicYearId,role,instituteId) {
    return await examStructureScheduleRepository.getExamStructureSchedule(universityId,acedmicYearId,role,instituteId);
};

export async function getSingleExamStructureSchedule(courseId,sessionId, universityId) {
    return await examStructureScheduleRepository.getSingleExamStructureSchedule(courseId,sessionId, universityId);
};

export async function deleteExamStructureSchedule(examStructureScheduleId) {
    return await examStructureScheduleRepository.deleteExamStructureSchedule(examStructureScheduleId);
};

export async function updateExamStructureSchedule(examStructureScheduleId, examDetail, updatedBy) {
    examDetail.updatedBy = updatedBy;
    await examStructureScheduleRepository.updateExamStructureSchedule(examStructureScheduleId, examDetail);
};

export async function addExamType(examDetail, createdBy, updatedBy,universityId,instituteId) {
    examDetail.createdBy = createdBy;
    examDetail.updatedBy = updatedBy;
    const result = await examStructureScheduleRepository.addExamType(examDetail);
    return result;
};

export async function getDetailByExamType(examSetupTypeId) {
    return await examStructureScheduleRepository.getDetailByExamType(examSetupTypeId);
};