import * as mainRepository from '../repository/mainRepository.js';

export async function getAllCollegesAndCourses(universityId) {
    try {
        const [ allUniversity, allCampus, allInstitute, allAffiliatedIniversity, allCourseLevel, allCourse,allSpecialization ]= 
        await Promise.all([
            mainRepository.getAllUniversity(universityId),
            mainRepository.getAllCampus(universityId),
            mainRepository.getAllInstitute(universityId),
            mainRepository.getAllAffiliatedUniversity(universityId),
            mainRepository.getAllCourseLevel(universityId),
            mainRepository.getAllCourse(universityId),
            mainRepository.getAllSpecialization(universityId)
        ]);

    return {
            allUniversity,
            allCampus,
            allInstitute,
            allAffiliatedIniversity,
            allCourseLevel,
            allCourse,
            allSpecialization
        };
    } catch (error) {
        console.error('Error fetching all Course details:', error);
        throw error;
    }
};

export async function addCampus(data){
    return await mainRepository.addCampus(data)
};

export async function addInstitute(data){
    return await mainRepository.addInstitute(data)
};

export async function addAffiliatedUniversity(data){
    return await mainRepository.addAffiliatedUniversity(data)
};

export async function addCourseLevel(data){
    return await mainRepository.addCourseLevel(data)
};

export async function addCourse(data){
    return await mainRepository.addCourse(data)
};

export async function addSpecialization(data){
    return await mainRepository.addSpecialization(data)
};