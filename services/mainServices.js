import { getCourseByCourseId } from '../repository/courseRepository.js';
import * as mainRepository from '../repository/mainRepository.js';
import sequelize from "../database/sequelizeConfig.js";

export async function getAllCollegesAndCourses(universityId,campusId,instituteId,acedmicYearId,role,headInstituteId) {
    try {
        const [ allUniversity, allCampus, allInstitute, allAffiliatedIniversity, allCourse,allSpecialization,allSubject ]= 
        await Promise.all([
            mainRepository.getAllUniversity(universityId),
            mainRepository.getAllCampus(universityId,campusId),
            mainRepository.getAllInstitute(universityId,instituteId,headInstituteId,role,campusId),
            mainRepository.getAllAffiliatedUniversity(universityId,instituteId,headInstituteId,role),
            mainRepository.getAllCourse(universityId,acedmicYearId,headInstituteId,role,instituteId),
            mainRepository.getAllSpecialization(universityId,acedmicYearId,headInstituteId,role),
            mainRepository.getAllSubject(universityId,acedmicYearId,headInstituteId,role,instituteId)
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
};

export async function addCourse(data, createdBy, instituteId) {
    const results = [];

    const transaction = await sequelize.transaction(); 

    try {
        const { course_levelId, universityId, courses, affiliatedUniversityId, acedmicYearId,term } = data;

        for (const course of courses) {
            // Add course
            const result = await mainRepository.addCourse({
                ...course,
                course_levelId,
                universityId,
                affiliatedUniversityId,
                createdBy,
                acedmicYearId,
                instituteId,
            }, transaction); 

            const courseId = result?.dataValues?.courseId;
            results.push(result);

            // add terms
            const { courseDuration } = course; 
            
            if (courseId && term && courseDuration) {
                let monthsPerTerm = 6;
                let termLabel = '';
                switch (term.toLowerCase()) {
                    case 'semester':
                        monthsPerTerm = 6;
                        termLabel = 'Sem';
                        break;
                    case 'trimester':
                        monthsPerTerm = 4;
                        termLabel = 'Tri';
                        break;
                    case 'quarterly':
                        monthsPerTerm = 3;
                        termLabel = 'Quar';
                        break;
                    case 'yearly':
                        monthsPerTerm = 12;
                        termLabel = 'Year';
                        break;
                    default:
                        console.warn(`Unknown term type: ${term}`);
                        continue;
                }
                const totalTerms = Math.floor(courseDuration * 12/ monthsPerTerm);

                for (let i = 1; i <= totalTerms; i++) {

                    await mainRepository.addSemester({
                        universityId,
                        courseId,
                        acedmicYearId,
                        instituteId,
                        termType:termLabel,
                        name: `${termLabel} ${i}`,
                        semesterDuration: monthsPerTerm,
                        courseDuration: courseDuration,
                        totalSemester: totalTerms,
                        createdBy,
                    }, transaction); 
                }
            }
        }

        await transaction.commit(); 

        return results;

    } catch (error) {
        await transaction.rollback(); 
        console.error('Error adding courses:', error);
        return { message: 'Error adding courses', error };
    }
};


export async function addSpecialization(data,createdBy,instituteId) {
    const results = [];
    try {
        const { course_Id, universityId, specializations,acedmicYearId } = data;

        for (const specialization of specializations) {
            const result = await mainRepository.addSpecialization({
                ...specialization,
                course_Id,
                universityId,createdBy,acedmicYearId,instituteId
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding specializations:', error);
        return { message: 'Error adding specializations', error };
    }
};

export async function addSubject(data,createdBy,instituteId) {
    const results = [];
    try {
        const { courseId, subjects,specializationId,universityId ,acedmicYearId} = data;

        for (const subject of subjects) {
            const result = await mainRepository.addSubject({
                ...subject,
                courseId,
                specializationId,
                universityId,createdBy,acedmicYearId,instituteId
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding subjects:', error);
        return { message: 'Error adding subjects', error };
    }
};

export async function addClass(data,createdBy,universityId,instituteId) {
    const results = [];
    try {
        const { courseId, specializationId, acedmicYearId,className, sections,semesterId,sessionId } = data; 
        const classObject = {courseId,className,universityId,updatedBy:createdBy,createdBy,instituteId,semesterId,sessionId }
        
        const classData = await mainRepository.seprateAddClass(classObject)
        const classId = classData.dataValues.classId
        
        for (const section of sections) {
            const result = await mainRepository.createClass({
                ...section,
                courseId,
                universityId,
                specializationId,
                createdBy,
                acedmicYearId,
                classId,instituteId,semesterId,sessionId 
            });            
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding class:', error);
        return { message: 'Error adding class', error };
    }
};

export async function getClassDetails(classSectionId,universityId,acedmicYearId,instituteId,role){
    return await mainRepository.getClassDetails(classSectionId,universityId,acedmicYearId,instituteId,role)
};

export async function addClassSubjectMapper(data, createdBy,instituteId) {  
    console.log(`>>>>>>>>>data`,data);
    try {
        const { semesterId, subjectIds } = data;

        // const classSection = await mainRepository.getSectionByClassId(classId);
        // const classSectionIds = classSection.map(section => section.classSectionsId);

        const entries = [];

        // for (const sectionId of classSectionIds) {
            for (const subjectId of subjectIds) {
                entries.push({
                    semesterId,
                    // classSectionId: sectionId,
                    subjectId,
                    createdBy,
                    instituteId
                });
            }
        // }

        const result = await mainRepository.addClassSubjectMapper(entries);
        return result;
    } catch (error) {
        console.error('Error adding class subject mappings:', error);
        return { message: 'Error adding class subject mappings', error };
    }
};


export async function getClassSubjectMapper(semesterId,universityId,acedmicYearId,instituteId,role){
    return await mainRepository.getClassSubjectMapper(semesterId,universityId,acedmicYearId,instituteId,role)
};

export async function addSemester(data,createdBy,universityId,instituteId){
    const { semesterDuration,courseId,acedmicYearId} = data
    const course = await getCourseByCourseId(courseId)
    const courseDuration = course.dataValues.courseDuration    
        const semesterData = {
        ...data,
        totalSemester: courseDuration/semesterDuration,
        createdBy,
        courseDuration:courseDuration,
        universityId,
        acedmicYearId,
        instituteId,
    };
    return await mainRepository.addSemester(semesterData)
};

export async function getSemester(courseId,specializationId,universityId,acedmicYearId,instituteId,role){
    return await mainRepository.getSemester(courseId,specializationId,universityId,acedmicYearId,instituteId,role)
};

export async function createClass(data, createdBy, universityId,instituteId) {
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
                instituteId,
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

export async function subjectExcel(excelData, courseId, specializationId, createdBy, universityId,instituteId) {
    try {
        const subjectCreationPromises = excelData.map(async (row) => {
            const subjectData = {
                courseId,
                specializationId,
                subjectName: row.subjectName,
                subjectCode: row.subjectCode,
                subjectType :row.subjectType,
                createdBy,
                universityId,
                instituteId,
            };

            return await mainRepository.addSubject(subjectData);
        });

        return await Promise.all(subjectCreationPromises);
    } catch (error) {
        console.error("Error in creating classes:", error);
        throw new Error("Failed to create classes");
    }
};