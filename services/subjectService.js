import * as subjectRepository from '../repository/subjectRepository.js';


export async function getAllSubjects(universityId, acedmicYearId, campusId, instituteId, courseId) {
    try {
        return await subjectRepository.getAllSubjects(universityId, acedmicYearId, campusId, instituteId, courseId);
    } catch (error) {
        console.error('Error in getAllSubjects service:', error);
        throw error;
    }
}
