import * as mainRepository from '../repository/mainRepository.js';

export async function getAllCollegesAndCourses(universityId) {
    try {
        const [ allUniversity, allCampus, allInstitute, allAffiliatedIniversity, allCourse,allSpecialization,allSubject ]= 
        await Promise.all([
            mainRepository.getAllUniversity(universityId),
            mainRepository.getAllCampus(universityId),
            mainRepository.getAllInstitute(universityId),
            mainRepository.getAllAffiliatedUniversity(universityId),
            mainRepository.getAllCourse(universityId),
            mainRepository.getAllSpecialization(universityId),
            mainRepository.getAllSubject(universityId)
        ]);

    return {
            allUniversity,
            allCampus,
            allInstitute,
            allAffiliatedIniversity,
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

export async function addClass(data) {
    try {
        const { courseId, specializationId, acedmicPeriodId, section } = data;
        const semesterData = await mainRepository.getSemester(courseId, specializationId);
        const totalSemesters = semesterData.map(semester => semester.dataValues.totalSemester);

        const totalSemester = totalSemesters.length > 0 ? Math.max(...totalSemesters) : 0;        

        const entries = [];

        for (let sem = 1; sem <= totalSemester; sem++) {
            for (let sec = 1; sec <= section; sec++) {
                const sectionName = `${sem}${String.fromCharCode(64 + sec)}`;
                entries.push({
                    courseId,
                    specializationId,
                    acedmicPeriodId,
                    section: sectionName
                });
            }
        }
        const result = await mainRepository.addClass(entries);
        return result;
    } catch (error) {
        console.error('Error adding class:', error);
        return { message: 'Error adding class', error };
    }
}

export async function getClassDetails(classSectionId){
    return await mainRepository.getClassDetails(classSectionId)
}

export async function addClassSubjectMapper(data) {
    try {
        const { classSectionId, subjectIds } = data;

        // Generate separate entries for each subjectId
        const entries = subjectIds.map(subjectId => ({
            classSectionId,
            subjectId
        }));

        // Insert multiple entries into the database
        const result = await mainRepository.addClassSubjectMapper(entries);
        return result;
    } catch (error) {
        console.error('Error adding class subject mappings:', error);
        return { message: 'Error adding class subject mappings', error };
    }
}

export async function getClassSubjectMapper(classSectionId){
    return await mainRepository.getClassSubjectMapper(classSectionId)
}

export async function addSemester(data){
    const { semesterDuration,courseDuration} = data
    const totalSemester = courseDuration*12/semesterDuration
    const semesterData = {
        ...data,
        totalSemester: totalSemester
    };
    return await mainRepository.addSemester(semesterData)
}

export async function getSemester(courseId,specializationId){
    return await mainRepository.getSemester(courseId,specializationId)
}