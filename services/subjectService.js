import * as subjectRepository from '../repository/subjectRepository.js';


export async function getAllSubjects(filter) {
    try {
        return await subjectRepository.getAllSubjects(filter);
    } catch (error) {
        console.error('Error in getAllSubjects service:', error);
        throw error;
    }
}

export async function setSubjectTerms(termsArray) {
    try {
        return await subjectRepository.setSubjectTerms(termsArray);
    } catch (error) {
        console.error('Error in setSubjectTerms service:', error);
        throw error;
    }
}
