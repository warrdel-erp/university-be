import * as subjectRepository from '../repository/subjectRepository.js';

export async function getSubjectTiny(universityId, acedmicYearId, campusId, instituteId) {
    try {
        return await subjectRepository.getSubjectTiny(universityId, acedmicYearId, campusId, instituteId);
    } catch (error) {
        console.error('Error in getSubjectTiny service:', error);
        throw error;
    }
};

export async function getAllSubjects(universityId, acedmicYearId, campusId, instituteId) {
    try {
        return await subjectRepository.getAllSubjects(universityId, acedmicYearId, campusId, instituteId);
    } catch (error) {
        console.error('Error in getAllSubjects service:', error);
        throw error;
    }
}
