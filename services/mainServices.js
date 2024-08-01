import * as mainRepository from '../repository/mainRepository.js';

export async function getAllCollegesAndCourses(universityId) {
    try {
        const [ allUniversity, allCampus, allInstitute, allAffiliatedIniversity, allCourseLevel, allCourse,allSpecialization,allSubject ]= 
        await Promise.all([
            mainRepository.getAllUniversity(universityId),
            mainRepository.getAllCampus(universityId),
            mainRepository.getAllInstitute(universityId),
            mainRepository.getAllAffiliatedUniversity(universityId),
            mainRepository.getAllCourseLevel(universityId),
            mainRepository.getAllCourse(universityId),
            mainRepository.getAllSpecialization(universityId),
            mainRepository.getAllSubject(universityId)
        ]);

    return {
            allUniversity,
            allCampus,
            allInstitute,
            allAffiliatedIniversity,
            allCourseLevel,
            allCourse,
            allSpecialization,
            allSubject
        };
    } catch (error) {
        console.error('Error fetching all Course details:', error);
        throw error;
    }
};

export async function addCampus(data) {
    const { universityId, campuses } = data;
    try {
        const createdCampuses = [];
        for (const campus of campuses) {
            const campusData = { ...campus, universityId };
            const createdCampus = await mainRepository.addCampus(campusData);
            createdCampuses.push(createdCampus);
        }
        return createdCampuses;
    } catch (error) {
        console.error('Add Campus Error in Service:', error);
        throw error;
    }
};

export async function addInstitute(data) {
    const results = [];
    try {
        const { campusId, universityId, institutes } = data;
        for (const institute of institutes) {
            const result = await mainRepository.addInstitute({
                ...institute,
                campusId,
                universityId
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding institutes:', error);
        return { message: 'Error adding institutes', error };
    }
}


export async function addAffiliatedUniversity(data) {
    const results = [];
    try {
        const { instituteId, universityId, affiliatedUniversities } = data;

        for (const affiliatedUniversity of affiliatedUniversities) {
            const result = await mainRepository.addAffiliatedUniversity({
                ...affiliatedUniversity,
                instituteId,
                universityId
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding affiliated universities:', error);
        return { message: 'Error adding affiliated universities', error };
    }
}


export async function addCourseLevel(data) {
    const results = [];
    try {
        const { affiliatedUniversityId, universityId, courseLevels } = data;

        for (const courseLevel of courseLevels) {
            const result = await mainRepository.addCourseLevel({
                ...courseLevel,
                affiliatedUniversityId,
                universityId
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding course levels:', error);
        return { message: 'Error adding course levels', error };
    }
}


export async function addCourse(data) {
    const results = [];
    try {
        const { course_levelId, universityId, courses } = data;

        for (const course of courses) {
            const result = await mainRepository.addCourse({
                ...course,
                course_levelId,
                universityId
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding courses:', error);
        return { message: 'Error adding courses', error };
    }
};

export async function addSpecialization(data) {
    const results = [];
    try {
        const { course_Id, universityId, specializations } = data;

        for (const specialization of specializations) {
            const result = await mainRepository.addSpecialization({
                ...specialization,
                course_Id,
                universityId
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding specializations:', error);
        return { message: 'Error adding specializations', error };
    }
};

export async function addSubject(data) {
    const results = [];
    try {
        const { courseId, subjects,specializationId,universityId } = data;

        for (const subject of subjects) {
            const result = await mainRepository.addSubject({
                ...subject,
                courseId,
                specializationId,
                universityId,
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding subjects:', error);
        return { message: 'Error adding subjects', error };
    }
};