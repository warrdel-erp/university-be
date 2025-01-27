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

export async function addCampus(data,createdBy) {
    const { universityId, campuses } = data;
    try {
        const createdCampuses = [];
        for (const campus of campuses) {
            const campusData = { ...campus, universityId,createdBy };
            const createdCampus = await mainRepository.addCampus(campusData);
            createdCampuses.push(createdCampus);
        }
        return createdCampuses;
    } catch (error) {
        console.error('Add Campus Error in Service:', error);
        throw error;
    }
};

export async function addInstitute(data,createdBy) {
    const results = [];
    try {
        const { campusId, universityId, institutes } = data;
        for (const institute of institutes) {
            const result = await mainRepository.addInstitute({
                ...institute,
                campusId,
                universityId,createdBy
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding institutes:', error);
        return { message: 'Error adding institutes', error };
    }
}


export async function addAffiliatedUniversity(data,createdBy) {
    const results = [];
    try {
        const { instituteId, universityId, affiliatedUniversities } = data;

        for (const affiliatedUniversity of affiliatedUniversities) {
            const result = await mainRepository.addAffiliatedUniversity({
                ...affiliatedUniversity,
                instituteId,
                universityId,createdBy
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding affiliated universities:', error);
        return { message: 'Error adding affiliated universities', error };
    }
}

export async function addCourse(data,createdBy) {
    
    const results = [];
    try {
        const { course_levelId, universityId, courses,affiliatedUniversityId } = data;

        for (const course of courses) {
            const result = await mainRepository.addCourse({
                ...course,
                course_levelId,
                universityId,
                affiliatedUniversityId,createdBy
            });            
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding courses:', error);
        return { message: 'Error adding courses', error };
    }
};

export async function addSpecialization(data,createdBy) {
    const results = [];
    try {
        const { course_Id, universityId, specializations } = data;

        for (const specialization of specializations) {
            const result = await mainRepository.addSpecialization({
                ...specialization,
                course_Id,
                universityId,createdBy
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding specializations:', error);
        return { message: 'Error adding specializations', error };
    }
};

export async function addSubject(data,createdBy) {
    const results = [];
    try {
        const { courseId, subjects,specializationId,universityId } = data;

        for (const subject of subjects) {
            const result = await mainRepository.addSubject({
                ...subject,
                courseId,
                specializationId,
                universityId,createdBy
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding subjects:', error);
        return { message: 'Error adding subjects', error };
    }
};

export async function addClass(data,createdBy,universityId) {
    
    try {
        const { courseId, specializationId, acedmicYearId, section } = data;
        const semesterData = await mainRepository.getSemester(courseId, specializationId,universityId);
        const totalSemesters = semesterData.map(semester => semester.dataValues.totalSemester);
        const totalSemester = totalSemesters.length > 0 ? Math.max(...totalSemesters) : 0;        

        const entries = [];

        for (let sem = 1; sem <= totalSemester; sem++) {
            for (let sec = 1; sec <= section; sec++) {
                const sectionName = `${sem}${String.fromCharCode(64 + sec)}`;
                entries.push({
                    courseId,
                    specializationId,
                    acedmicYearId,
                    section: sectionName,createdBy
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

export async function getClassDetails(classSectionId,universityId){
    return await mainRepository.getClassDetails(classSectionId,universityId)
}

export async function addClassSubjectMapper(data,createdBy) {
    try {
        const { classSectionId, subjectIds } = data;

        // Generate separate entries for each subjectId
        const entries = subjectIds.map(subjectId => ({
            classSectionId,
            subjectId,createdBy
        }));

        // Insert multiple entries into the database
        const result = await mainRepository.addClassSubjectMapper(entries);
        return result;
    } catch (error) {
        console.error('Error adding class subject mappings:', error);
        return { message: 'Error adding class subject mappings', error };
    }
}

export async function getClassSubjectMapper(classSectionId,universityId){
    return await mainRepository.getClassSubjectMapper(classSectionId,universityId)
}

export async function addSemester(data,createdBy){
    const { semesterDuration,courseDuration} = data
    const totalSemester = courseDuration*12/semesterDuration
    const semesterData = {
        ...data,
        totalSemester: totalSemester,createdBy
    };
    return await mainRepository.addSemester(semesterData)
}

export async function getSemester(courseId,specializationId,universityId){
    return await mainRepository.getSemester(courseId,specializationId,universityId)
}

export async function createClass(data, createdBy, universityId) {
    const results = [];
    try {
        const { courseId, acedmicYearId, specializationId, section } = data;

        for (const sectionValue of section) {
            const result = await mainRepository.createClass({
                courseId,
                specializationId,
                acedmicYearId,
                universityId,
                createdBy,
                section: sectionValue 
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding class directly:', error);
        return { message: 'Error adding class directly', error };
    }
};