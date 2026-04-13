import * as examScheduleRepository from '../repository/examScheduleRepository.js';

export async function getExamSchedules(universityId, acedmicYearId, instituteId, filters) {
    return await examScheduleRepository.getExamSchedules(universityId, acedmicYearId, instituteId, filters);
}
