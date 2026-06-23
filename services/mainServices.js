import { changeCourseStatuss, getCourseByCourseId } from '../repository/courseRepository.js';
import * as mainRepository from '../repository/mainRepository.js';
import sequelize from "../database/sequelizeConfig.js";
import * as studentRepository from '../repository/studentRepository.js';

export async function getAllCollegesAndCourses(campusId, instituteId, acedmicYearId) {
    try {
        const [allUniversity, allCampus, allInstitute, allAffiliatedIniversity, allCourse, allSpecialization, allSubject] =
            await Promise.all([
                mainRepository.getAllUniversity(),
                mainRepository.getAllCampus(campusId),
                mainRepository.getAllInstitute(campusId, instituteId),
                mainRepository.getAllAffiliatedUniversity(instituteId),
                mainRepository.getAllCourse(campusId),
                mainRepository.getAllSpecialization(acedmicYearId),
                mainRepository.getAllSubject(acedmicYearId, instituteId)
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
}

export async function addCampus(data, createdBy) {
    const { campuses } = data;
    try {
        const createdCampuses = [];
        for (const campus of campuses) {
            const createdCampus = await mainRepository.addCampus({ ...campus, createdBy });
            createdCampuses.push(createdCampus);
        }
        return createdCampuses;
    } catch (error) {
        console.error('Add Campus Error in Service:', error);
        throw error;
    }
}

export async function addInstitute(data, createdBy) {
    const results = [];
    try {
        const { campusId, institutes } = data;
        for (const institute of institutes) {
            const result = await mainRepository.addInstitute({
                ...institute,
                campusId,
                createdBy
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding institutes:', error);
        return { message: 'Error adding institutes', error };
    }
}

export async function addAffiliatedUniversity(data, createdBy) {
    const results = [];
    try {
        const { instituteId, affiliatedUniversities } = data;

        for (const affiliatedUniversity of affiliatedUniversities) {
            const result = await mainRepository.addAffiliatedUniversity({
                ...affiliatedUniversity,
                instituteId,
                createdBy
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding affiliated universities:', error);
        return { message: 'Error adding affiliated universities', error };
    }
}

export async function addCourse(data, createdBy) {
    const results = [];

    const transaction = await sequelize.transaction();

    try {
        const { course_levelId, courses, affiliatedUniversityId, acedmicYearId, term } = data;

        for (const course of courses) {

            const { courseDuration } = course;

            if (term && courseDuration) {
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
                const totalTerms = Math.floor(courseDuration * 12 / monthsPerTerm);

                const result = await mainRepository.addCourse({
                    ...course,
                    course_levelId,
                    affiliatedUniversityId,
                    createdBy,
                    acedmicYearId,
                    totalTerms,
                    termType: termLabel
                }, transaction);

                results.push(result)
            } else {
                throw new Error("Term and Course Duration is required")
            }
        }

        await transaction.commit();

        return results;

    } catch (error) {
        await transaction.rollback();
        console.error('Error adding courses:', error);
        throw { message: 'Error adding courses', error };
    }
}

export const changeCourseStatus = async (courseId) => {
    const course = await getCourseByCourseId(courseId);
    if (!course) {
        throw new Error('Course not found');
    }

    const newStatus = !course.dataValues.isActive;

    await changeCourseStatuss(courseId, { isActive: newStatus });

    return {
        message: `Course status updated successfully to`,
        isActive: newStatus
    };
};

export async function addSpecialization(data, createdBy) {
    const results = [];
    try {
        const { course_Id, specializations, acedmicYearId } = data;

        for (const specialization of specializations) {
            const result = await mainRepository.addSpecialization({
                ...specialization,
                course_Id,
                createdBy,
                acedmicYearId,
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding specializations:', error);
        return { message: 'Error adding specializations', error };
    }
}

export async function addSubject(data, createdBy) {
    const results = [];
    try {
        const { courseId, subjects, specializationId, acedmicYearId } = data;

        for (const subject of subjects) {
            const result = await mainRepository.addSubject({
                ...subject,
                courseId,
                specializationId,
                createdBy,
                acedmicYearId,
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding subjects:', error);
        return { message: 'Error adding subjects', error };
    }
}

export async function updateSubject(data, updateBy) {
    data.updateBy = updateBy;
    const subjectId = data?.subjectId
    return await mainRepository.updateSubject(subjectId, data);
}

export async function addClass(data, createdBy) {
    const results = [];
    try {
        if (!data) throw new Error('Data is required');
        if (!createdBy) throw new Error('CreatedBy is required');

        const { courseId, acedmicYearId, className, sections, term, sessionId } = data;

        if (!courseId) throw new Error('CourseId is required');
        if (!acedmicYearId) throw new Error('AcedmicYearId is required');
        if (!className) throw new Error('ClassName is required');
        if (!sections || !Array.isArray(sections) || sections.length === 0) throw new Error('Sections are required and must be a non-empty array');
        if (!term) throw new Error('Term is required');
        if (!sessionId) throw new Error('SessionId is required');

        const termNum = Number(term);
        const semesterId = await mainRepository.findSemesterIdByCourseIdAndTerm(
            Number(courseId),
            termNum,
            Number(acedmicYearId),
        );

        if (!semesterId) {
            throw new Error(
                `No semesterId found for course ${courseId} with term/class ${termNum}`,
            );
        }

        // 1) class — sessionId, courseId, term, semesterId
        const classData = await mainRepository.seprateAddClass({
            courseId: Number(courseId),
            className,
            term: termNum,
            sessionId: Number(sessionId),
            semesterId,
            createdBy,
            updatedBy: createdBy,
        });
        const classId = classData.dataValues.classId;

        // 2) class_sections — acedmicYearId, class, semesterId, sessionId, courseId, section
        for (const section of sections) {
            if (!section.sectionId) {
                throw new Error('sectionId is required for each section');
            }

            const result = await mainRepository.createClassSections({
                courseId: Number(courseId),
                acedmicYearId: Number(acedmicYearId),
                sessionId: Number(sessionId),
                semesterId,
                classId,
                term: termNum,
                sectionId: Number(section.sectionId),
                section: section.section,
                class: String(termNum),
                createdBy,
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding class:', error);
        throw error;
    }
}

export async function getClassDetails(classSectionId, acedmicYearId) {
    return await mainRepository.getClassDetails(classSectionId, acedmicYearId)
}

export async function getClassSpecific(campusId, instituteId, acedmicYearId, courseId, sessionId) {
    return await mainRepository.getClassSpecific(campusId, instituteId, acedmicYearId, courseId, sessionId);
}

export async function addClassSubjectMapper(data, createdBy) {
    try {
        const { subjectIds } = data;

        const entries = [];

        for (const subjectId of subjectIds) {
            entries.push({
                subjectId,
                createdBy,
            });
        }

        const result = await mainRepository.addClassSubjectMapper(entries);
        return result;
    } catch (error) {
        console.error('Error adding class subject mappings:', error);
        return { message: 'Error adding class subject mappings', error };
    }
}

export async function getClassSubjectMapper(semesterId, acedmicYearId) {
    return await mainRepository.getClassSubjectMapper(semesterId, acedmicYearId)
}

export async function addSemester(data, createdBy) {
    const { semesterDuration, courseId, acedmicYearId } = data
    const course = await getCourseByCourseId(courseId)
    const courseDuration = course.dataValues.courseDuration
    const semesterData = {
        ...data,
        totalSemester: courseDuration / semesterDuration,
        createdBy,
        courseDuration: courseDuration,
        acedmicYearId,
    };
    return await mainRepository.addSemester(semesterData)
}

export async function getSemester(courseId, specializationId, acedmicYearId) {
    return await mainRepository.getSemester(courseId, specializationId, acedmicYearId)
}

export async function getSemesterById(semesterId) {
    return await mainRepository.getSemesterById(semesterId)
}

export async function createClass(data, createdBy) {
    const results = [];
    try {
        const {
            courseId,
            acedmicYearId,
            specializationId,
            section,
            term,
            sessionId,
            classId,
            semesterId: payloadSemesterId,
        } = data;

        if (!courseId || !acedmicYearId) {
            throw new Error('courseId and acedmicYearId are required');
        }
        if (!section || !Array.isArray(section) || section.length === 0) {
            throw new Error('section is required and must be a non-empty array');
        }

        let semesterId = payloadSemesterId != null ? Number(payloadSemesterId) : null;

        if (!semesterId && term != null) {
            semesterId = await mainRepository.findSemesterIdByCourseIdAndTerm(
                Number(courseId),
                Number(term),
                Number(acedmicYearId),
            );
        }

        if (!semesterId) {
            throw new Error(
                `No semesterId found for course ${courseId} with term/class ${term}`,
            );
        }

        for (const sectionValue of section) {
            const result = await mainRepository.createClassSections({
                courseId: Number(courseId),
                specializationId,
                acedmicYearId: Number(acedmicYearId),
                sessionId: Number(sessionId),
                semesterId,
                classId,
                term: Number(term),
                section: sectionValue,
                class: term != null ? String(term) : undefined,
                createdBy,
            });
            results.push(result);
        }
        return results;
    } catch (error) {
        console.error('Error adding class directly:', error);
        throw error;
    }
}

export async function subjectExcel(excelData, courseId, acedmicYearId, specializationId, createdBy) {
    try {
        const subjectCreationPromises = excelData.map(async (row) => {
            const subjectData = {
                courseId,
                acedmicYearId,
                specializationId,
                subjectName: row.subjectName,
                subjectCode: row.subjectCode,
                subjectType: row.subjectType,
                createdBy,
            };

            return await mainRepository.addSubject(subjectData);
        });

        return await Promise.all(subjectCreationPromises);
    } catch (error) {
        console.error("Error in creating subject bulk upload:", error);
        throw new Error("Failed to create subject bulk upload");
    }
}

export async function getClassRecord(courseId, semesterId, classSectionId, acedmicYearId) {
    const result = await studentRepository.getClassRecord(courseId, semesterId, classSectionId, acedmicYearId);

    const response = {
        student: result.student.map((s) => ({
            studentId: s.studentId,
            firstName: s.firstName,
            lastName: s.lastName,
            scholarNumber: s.scholarNumber,
            email: s.email,
            phoneNumber: s.phoneNumber,
            semesterName: s.studentSemester?.name || null,
            className: s.studentSections?.class || null,
            sectionName: s.studentSections?.section || null,
        })),

        teacher: result.teacher.map((t) => ({
            employeeId: t.employeeData?.employeeId,
            employeeName: t.employeeData?.employeeName,
            employeeCode: t.employeeData?.employeeCode,
            department: t.employeeData?.department,
            dateOfBirth: t.employeeData?.dateOfBirth,
            subjects: t.employeeData?.teacherEmployeeData?.map((sub) => ({
                subjectName: sub.employeeSubject?.subjects?.subjectName,
                subjectCode: sub.employeeSubject?.subjects?.subjectCode,
                subjectType: sub.employeeSubject?.subjects?.subjectType,
            })) || [],
        })),
    };

    return response;
}

export async function getMonthlyIncomeService() {
    try {
        const rows = await mainRepository.getMonthlyIncomeRepository();

        const labels = [];
        const incomeData = [];

        rows.forEach((row) => {
            labels.push(row.dataValues.month);
            incomeData.push(parseFloat(row.dataValues.totalIncome) || 0);
        });

        return {
            labels,
            datasets: [
                {
                    type: "bar",
                    label: "Income",
                    data: incomeData,
                    backgroundColor: "rgba(75, 192, 192, 0.5)",
                    borderColor: "rgb(75, 192, 192)"
                }
            ]
        };

    } catch (error) {
        console.error("Error in getMonthlyIncomeService:", error);
        throw error;
    }
}

export async function getClassSectionsByFilter(sessionId, courseId, acedmicYearId) {
    return await mainRepository.getClassSectionsByFilter(sessionId, courseId, acedmicYearId);
}
