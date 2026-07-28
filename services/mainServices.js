import { getCourseByCourseId, updateCourseById, changeCourseStatuss, assertCourseIsActive } from '../repository/courseRepository.js';
import * as mainRepository from '../repository/mainRepository.js';
import * as instituteRepository from '../repository/instituteRepository.js';
import { getSingleDepartmentDetails } from '../repository/departmentRepository.js';
import sequelize from "../database/sequelizeConfig.js";
import * as studentRepository from '../repository/studentRepository.js';
import { resolveProgramTerm, resolveStudentSection } from '../utility/classSectionIncludes.js';
import { buildTermName, termsForYear, resolveTotalTerms } from '../utility/courseTerms.js';

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

function resolveDepartmentIdFromInput(data) {
    return (
        coercePositiveInt(data.departmentId)
        ?? coercePositiveInt(data.subAccountId)
    );
}

function normalizeAddCoursePayload(data) {
    const rootTerm = data.term ?? 'semester';
    const rootDepartmentId = resolveDepartmentIdFromInput(data);
    const courses = Array.isArray(data.courses) ? data.courses : [];

    return {
        course_levelId: coercePositiveInt(data.course_levelId),
        affiliatedUniversityId: coercePositiveInt(data.affiliatedUniversityId),
        academicYearId: coercePositiveInt(data.academicYearId),
        departmentId: rootDepartmentId,
        term: rootTerm,
        courses: courses.map((course) => ({
            courseName: course.courseName,
            courseCode: course.courseCode,
            departmentId:
                coercePositiveInt(course.departmentId)
                ?? coercePositiveInt(course.subAccountId)
                ?? rootDepartmentId,
            courseDuration: course.courseDuration != null && course.courseDuration !== ''
                ? Number(course.courseDuration)
                : null,
            capacity: course.capacity != null ? String(course.capacity) : undefined,
            term: course.term ?? rootTerm,
        })),
    };
}

async function resolveDepartmentId(departmentId) {
    if (departmentId == null) {
        return null;
    }
    const department = await getSingleDepartmentDetails(departmentId);
    if (!department) {
        throw new Error('departmentId not found for this institute');
    }
    return departmentId;
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

    let affiliatedUniversityId = normalized.affiliatedUniversityId ?? null;
    if (affiliatedUniversityId) {
        const affiliated = await instituteRepository.getAffiliatedUniversityById(affiliatedUniversityId);
        if (!affiliated) {
            throw new Error('affiliatedUniversityId not found for this institute');
        }
    } else {
        affiliatedUniversityId = await instituteRepository.findDefaultAffiliatedUniversityId();
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
            const courseDepartmentId =
                coercePositiveInt(course.departmentId)
                ?? coercePositiveInt(course.subAccountId);
            if (courseDepartmentId != null) {
                payload.departmentId = await resolveDepartmentId(courseDepartmentId);
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
        departmentId: departmentIdInput,
        subAccountId: subAccountIdInput,
        affiliatedUniversityId: affiliatedUniversityIdInput,
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
        departmentIdInput !== undefined
            ? departmentIdInput
            : subAccountIdInput;

    if (programId !== undefined) {
        updateData.departmentId = programId == null ? null : await resolveDepartmentId(programId);
    }

    if (affiliatedUniversityIdInput !== undefined) {
        if (affiliatedUniversityIdInput == null) {
            updateData.affiliatedUniversityId = null;
        } else {
            const affiliated = await instituteRepository.getAffiliatedUniversityById(
                affiliatedUniversityIdInput,
            );
            if (!affiliated) {
                throw new Error('affiliatedUniversityId not found for this institute');
            }
            updateData.affiliatedUniversityId = affiliatedUniversityIdInput;
        }
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
        const { course_Id, specializations, academicYearId } = data;

        for (const specialization of specializations) {
            const result = await mainRepository.addSpecialization({
                ...specialization,
                course_Id,
                createdBy,
                academicYearId,
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

export async function addClassSections(data, createdBy) {
    try {
        const { courseId, sessionId, section, year } = data;
        const yearNum = Number(year);
        const sectionName = String(section).trim();

        const course = await getCourseByCourseId(Number(courseId));
        if (!course) throw new Error('Course not found');

        const totalTerms = resolveTotalTerms(course);
        if (totalTerms <= 0) {
            throw new Error('Course courseDuration and termType must be configured before creating class sections');
        }

        const courseDuration = Number(course.courseDuration) || 1;
        if (yearNum < 1 || yearNum > courseDuration) {
            throw new Error(
                `year must be between 1 and ${courseDuration} for course ${courseId}`,
            );
        }

        const termNumbers = termsForYear(yearNum, course);
        if (!termNumbers.length) {
            throw new Error(`No program terms found for year ${yearNum}`);
        }

        const transaction = await sequelize.transaction();
        try {
            let classSectionRow = await mainRepository.findClassSectionForYear(
                {
                    courseId: Number(courseId),
                    sessionId: Number(sessionId),
                    section: sectionName,
                    year: yearNum,
                },
                { transaction },
            );

            const classSectionCreated = !classSectionRow;

            if (!classSectionRow) {
                classSectionRow = await mainRepository.createClassSectionRow({
                    courseId: Number(courseId),
                    sessionId: Number(sessionId),
                    year: yearNum,
                    section: sectionName,
                    instituteId: course.instituteId,
                    createdBy,
                }, { transaction });
            }

            const classSectionPlain = classSectionRow.get({ plain: true });
            const classSectionsId = classSectionPlain.classSectionsId;

            const terms = [];
            for (const termNum of termNumbers) {
                const classSectionTermRow = await mainRepository.findOrCreateClassSectionTerm(
                    {
                        classSectionsId,
                        term: termNum,
                        createdBy,
                        universityId: course.universityId,
                        instituteId: course.instituteId,
                    },
                    { transaction },
                );

                const termPlain = classSectionTermRow.get({ plain: true });
                terms.push({
                    classSectionTermId: termPlain.classSectionTermId,
                    term: termPlain.term,
                });
            }

            await transaction.commit();
            return {
                ...classSectionPlain,
                year: yearNum,
                terms,
                classSectionCreated,
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

export async function getClassSectionDetails(classSectionId, academicYearId) {
    return await mainRepository.getClassSectionDetails(classSectionId, academicYearId)
}

export async function getClassSectionSpecific(campusId, instituteId, academicYearId, courseId, sessionId) {
    return await mainRepository.getClassSectionSpecific(campusId, instituteId, academicYearId, courseId, sessionId);
}

export async function addSectionSubjectMapper(data, createdBy) {
    try {
        const { subjectIds } = data;

        const entries = [];

        for (const subjectId of subjectIds) {
            entries.push({
                subjectId,
                createdBy,
            });
        }

        const result = await mainRepository.addSectionSubjectMapper(entries);
        return result;
    } catch (error) {
        console.error('Error adding class subject mappings:', error);
        return { message: 'Error adding class subject mappings', error };
    }
}

export async function getSectionSubjectMapper(term, academicYearId) {
    return await mainRepository.getSectionSubjectMapper(term, academicYearId)
}

export async function subjectExcel(excelData, courseId, academicYearId, specializationId, createdBy) {
    try {
        await assertCourseIsActive(courseId, 'have new subjects added');

        const subjectCreationPromises = excelData.map((row) =>
            mainRepository.addSubject({
                courseId,
                academicYearId,
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

export async function getClassSectionRecord(courseId, classSectionId) {
    const result = await studentRepository.getClassSectionRecord(courseId, classSectionId);
    const course = await getCourseByCourseId(courseId);
    const termType = course?.termType ?? null;

    const section = result.classSection
        ? (result.classSection.get
            ? result.classSection.get({ plain: true })
            : result.classSection)
        : null;

    const terms = [];
    for (const row of result.termRows ?? []) {
        const termNum = row.term != null ? Number(row.term) : null;
        terms.push({
            classSectionTermId: row.classSectionTermId,
            term: termNum,
            termName: termNum != null && termType ? buildTermName(termType, termNum) : null,
        });
    }

    const response = {
        classSection: section
            ? {
                classSectionsId: section.classSectionsId,
                courseId: section.courseId,
                academicYearId: section.academicYearId ?? null,
                sectionName: section.section ?? null,
                className: section.year != null ? String(section.year) : null,
                terms,
            }
            : null,
        student: result.student.map((s) => {
            const plain = s.get ? s.get({ plain: true }) : s;
            const term = plain.studentClassSectionTerm?.term ?? resolveProgramTerm(resolveStudentSection(plain)) ?? null;
            const termNum = term != null ? Number(term) : null;

            return {
                studentId: plain.studentId,
                firstName: plain.firstName,
                lastName: plain.lastName,
                scholarNumber: plain.scholarNumber,
                email: plain.email,
                phoneNumber: plain.phoneNumber,
                classSectionTermId: plain.classSectionTermId ?? null,
                term: termNum,
                termName: termNum != null && termType ? buildTermName(termType, termNum) : null,
                className: resolveStudentSection(plain)?.year != null
                    ? String(resolveStudentSection(plain).year)
                    : null,
                sectionName: resolveStudentSection(plain)?.section || null,
            };
        }),

        teacher: result.teacher.map((t) => ({
            userId: t.employeeData?.userId,
            employeeName: t.employeeData?.employeeName,
            employeeCode: t.employeeData?.employeeCode,
            departmentId: t.employeeData?.departmentId ?? null,
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

export async function getClassSectionsByFilter(sessionId, courseId, academicYearId) {
    return await mainRepository.getClassSectionsByFilter(sessionId, courseId, academicYearId);
}