import * as examScheduleRepository from '../repository/examScheduleRepository.js';

export async function getExamSchedules(universityId, acedmicYearId, instituteId, filters) {
    return await examScheduleRepository.getExamSchedules(universityId, acedmicYearId, instituteId, filters);
}

export async function getExamScheduleById(examScheduleId) {
    return await examScheduleRepository.getExamScheduleById(examScheduleId);
}
