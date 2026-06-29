import { getCourseByCourseId, updateCourseById, changeCourseStatuss, assertCourseIsActive } from '../repository/courseRepository.js';
import * as mainRepository from '../repository/mainRepository.js';
import * as instituteRepository from '../repository/instituteRepository.js';
import { getSingleSubAccountDetails } from '../repository/subAccountRepository.js';
import sequelize from "../database/sequelizeConfig.js";
import * as studentRepository from '../repository/studentRepository.js';

function coercePositiveInt(value) {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function resolveTermConfig(term) {
    switch (String(term ?? 'semester').toLowerCase()) {
        case 'semester':
            return { monthsPerTerm: 6, termLabel: 'Sem' };
        case 'trimester':
            return { monthsPerTerm: 4, termLabel: 'Tri' };
        case 'quarterly':
            return { monthsPerTerm: 3, termLabel: 'Quar' };
        case 'yearly':
            return { monthsPerTerm: 12, termLabel: 'Year' };
        default:
            return null;
    }
}

function normalizeAddCoursePayload(data) {
    const rootTerm = data.term ?? 'semester';
    const rootSubAccountId =
        coercePositiveInt(data.subAccountId) ?? coercePositiveInt(data.departmentId);
    const courses = Array.isArray(data.courses) ? data.courses : [];

    return {
        course_levelId: coercePositiveInt(data.course_levelId),
        affiliatedUniversityId: coercePositiveInt(data.affiliatedUniversityId),
        acedmicYearId: coercePositiveInt(data.acedmicYearId),
        subAccountId: rootSubAccountId,
        term: rootTerm,
        courses: courses.map((course) => ({
            courseName: course.courseName,
            courseCode: course.courseCode,
            subAccountId:
                coercePositiveInt(course.subAccountId)
                ?? coercePositiveInt(course.departmentId)
                ?? rootSubAccountId,
            courseDuration: course.courseDuration != null && course.courseDuration !== ''
                ? Number(course.courseDuration)
                : null,
            capacity: course.capacity != null ? String(course.capacity) : undefined,
            term: course.term ?? rootTerm,
        })),
    };
}

async function resolveSubAccountId(subAccountId) {
    if (subAccountId == null) {
        return null;
    }
    const subAccount = await getSingleSubAccountDetails(subAccountId);
    if (!subAccount) {
        throw new Error('subAccountId not found for this institute');
    }
    return subAccountId;
}

export async function getAllCollegesAndCourses() {
    try {
        const [allUniversity, allCampus, allInstitute, allAffiliatedIniversity, allCourse, allSpecialization, allSubject] =
            await Promise.all([
                mainRepository.getAllUniversity(),
                mainRepository.getAllCampus(),
                mainRepository.getAllInstitute(),
                mainRepository.getAllAffiliatedUniversity(),
                mainRepository.getAllCourse(),
                mainRepository.getAllSpecialization(),
                mainRepository.getAllSubject(),
            ]);

        return {
            allUniversity,
            allCampus,
            allInstitute,
            allAffiliatedIniversity,
            allCourse,
            allSpecialization,
            allSubject,
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
    const normalized = normalizeAddCoursePayload(data);

    if (!normalized.course_levelId) {
        throw new Error('course_levelId is required');
    }
    if (!normalized.courses.length) {
        throw new Error('courses array is required');
    }

    let affiliatedUniversityId = normalized.affiliatedUniversityId;
    if (affiliatedUniversityId) {
        const affiliated = await instituteRepository.getAffiliatedUniversityById(affiliatedUniversityId);
        if (!affiliated) {
            throw new Error('affiliatedUniversityId not found for this institute');
        }
    } else {
        affiliatedUniversityId = await instituteRepository.findDefaultAffiliatedUniversityId();
    }
    if (!affiliatedUniversityId) {
        throw new Error('No affiliated university found for this institute. Create one first or pass affiliatedUniversityId.');
    }

    const results = [];
    const transaction = await sequelize.transaction();

    try {
        for (const course of normalized.courses) {
            if (!course.courseName || !course.courseCode) {
                throw new Error('courseName and courseCode are required for each course');
            }

            const termConfig = resolveTermConfig(course.term);
            if (!termConfig) {
                throw new Error(`Unknown term type: ${course.term}`);
            }

            const payload = {
                courseName: course.courseName,
                courseCode: course.courseCode,
                course_levelId: normalized.course_levelId,
                affiliatedUniversityId,
                createdBy,
                termType: termConfig.termLabel,
            };

            if (course.capacity != null) {
                payload.capacity = course.capacity;
            }
            if (course.courseDuration != null) {
                payload.courseDuration = course.courseDuration;
                payload.totalTerms = Math.floor(
                    (course.courseDuration * 12) / termConfig.monthsPerTerm,
                );
            }
            if (course.subAccountId != null) {
                payload.subAccountId = await resolveSubAccountId(course.subAccountId);
            }

            const result = await mainRepository.addCourse(payload, transaction);
            results.push(result);
        }

        await transaction.commit();
        return results;
    } catch (error) {
        await transaction.rollback();
        console.error('Error adding courses:', error);
        throw error;
    }
}

export async function updateCourse(data) {
    const {
        courseId,
        courseName,
        courseCode,
        departmentId,
        subAccountId: subAccountIdInput,
    } = data;

    const course = await getCourseByCourseId(courseId);
    if (!course) {
        throw new Error('Course not found');
    }

    const updateData = {};
    if (courseName != null) {
        updateData.courseName = courseName;
    }
    if (courseCode != null) {
        updateData.courseCode = courseCode;
    }

    const programId =
        subAccountIdInput !== undefined
            ? subAccountIdInput
            : departmentId;

    if (programId !== undefined) {
        updateData.subAccountId = programId == null ? null : await resolveSubAccountId(programId);
    }

    const updated = await updateCourseById(courseId, updateData);
    if (!updated) {
        throw new Error('Course not found');
    }

    return updated;
}

export async function changeCourseStatus(courseId, isActive) {
    const course = await getCourseByCourseId(courseId);
    if (!course) {
        throw new Error('Course not found');
    }

    await changeCourseStatuss(courseId, { isActive });

    return {
        courseId: Number(courseId),
        isActive,
        message: isActive ? 'Course activated successfully' : 'Course deactivated successfully',
    };
}

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
    const { courseId, specializationId, ...subject } = data;
    await assertCourseIsActive(courseId, 'have new subjects added');

    return mainRepository.addSubject({
        ...subject,
        courseId,
        specializationId,
        createdBy,
        isActive: subject.isActive ?? true,
    });
}

export async function updateSubject(data) {
    const { subjectId, ...payload } = data;

    if (payload.courseId != null) {
        await assertCourseIsActive(payload.courseId, 'receive subject updates');
    }

    return mainRepository.updateSubject(subjectId, payload);
}

export async function addClass(data, createdBy) {
    try {
        if (!data) throw new Error('Data is required');
        if (!createdBy) throw new Error('CreatedBy is required');

        const { courseId, acedmicYearId, className, sections, term, sessionId } = data;

        if (!courseId) throw new Error('CourseId is required');
        if (!acedmicYearId) throw new Error('AcedmicYearId is required');
        if (!className) throw new Error('ClassName is required');
        if (!sections?.length) throw new Error('Sections are required and must be a non-empty array');
        if (term == null || term === '') throw new Error('Term is required');
        if (!sessionId) throw new Error('SessionId is required');

        const transaction = await sequelize.transaction();
        try {
            const classSemesterId = await mainRepository.findOrCreateSemesterIdForClass({
                courseId: Number(courseId),
                term: Number(term),
                acedmicYearId: Number(acedmicYearId),
                createdBy,
                transaction,
            });

            const classRow = await mainRepository.seprateAddClass({
                courseId: Number(courseId),
                className,
                term: Number(term),
                sessionId: Number(sessionId),
                semesterId: classSemesterId,
                createdBy,
                updatedBy: createdBy,
            }, { transaction });

            const classId = classRow.classId ?? classRow.dataValues?.classId;
            if (!classId) {
                throw new Error('Class could not be created');
            }

            const sectionPayload = {
                courseId: Number(courseId),
                acedmicYearId: Number(acedmicYearId),
                sessionId: Number(sessionId),
                classId,
                class: String(term),
                createdBy,
            };

            const sectionResults = [];
            for (const section of sections) {
                if (!section.sectionId) {
                    throw new Error('sectionId is required for each section');
                }
                const row = await mainRepository.createClassSections({
                    ...sectionPayload,
                    sectionId: Number(section.sectionId),
                    section: section.section,
                }, { transaction });
                sectionResults.push(row);
            }

            await transaction.commit();
            return {
                semesterId: classSemesterId,
                classId,
                class: classRow,
                sections: sectionResults,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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
        } = data;

        if (!courseId || !acedmicYearId) {
            throw new Error('courseId and acedmicYearId are required');
        }
        if (!section || !Array.isArray(section) || section.length === 0) {
            throw new Error('section is required and must be a non-empty array');
        }

        for (const sectionValue of section) {
            const result = await mainRepository.createClassSections({
                courseId: Number(courseId),
                specializationId,
                acedmicYearId: Number(acedmicYearId),
                sessionId: Number(sessionId),
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
        await assertCourseIsActive(courseId, 'have new subjects added');

        const subjectCreationPromises = excelData.map((row) =>
            mainRepository.addSubject({
                courseId,
                acedmicYearId,
                specializationId,
                subjectName: row.subjectName,
                subjectCode: row.subjectCode,
                subjectType: row.subjectType,
                subjectCategory: row.subjectCategory,
                shortName: row.shortName,
                description: row.description,
                isActive: row.isActive ?? true,
                createdBy,
            }),
        );

        return await Promise.all(subjectCreationPromises);
    } catch (error) {
        console.error("Error in creating subject bulk upload:", error);
        throw new Error("Failed to create subject bulk upload");
    }
}

export async function getClassRecord(courseId, classSectionsId) {
    const result = await studentRepository.getClassRecord(courseId, classSectionsId);
    const section = result.classSection
        ? (result.classSection.get
            ? result.classSection.get({ plain: true })
            : result.classSection)
        : null;

    const response = {
        classSection: section
            ? {
                classSectionsId: section.classSectionsId,
                courseId: section.courseId,
                acedmicYearId: section.acedmicYearId ?? null,
                sectionName: section.section ?? null,
                className: section.class ?? null,
                term: section.classGroup?.term ?? section.class ?? null,
            }
            : null,
        student: result.student.map((s) => ({
            studentId: s.studentId,
            firstName: s.firstName,
            lastName: s.lastName,
            scholarNumber: s.scholarNumber,
            email: s.email,
            phoneNumber: s.phoneNumber,
            semesterId: s.semesterId ?? null,
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
