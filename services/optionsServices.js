import * as optionsRepository from '../repository/optionsRepository.js';
import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import { STUDENT_STATUS_OPTIONS } from '../constant.js';
import { buildCourseTermOptions } from '../utility/courseTerms.js';

export async function getAffiliatedUniversityOptions() {
    return await optionsRepository.getAffiliatedUniversityOptions();
}

export async function getCourseOptions(courseLevelId) {
    return await optionsRepository.getCourseOptions(courseLevelId);
}

export async function getTermOptions(courseId) {
    const course = await optionsRepository.getCourseData(courseId);
    if (!course) return [];

    const { totalTerms, termType } = course;
    const options = [];
    for (let i = 1; i <= totalTerms; i++) {
        options.push({
            label: `${termType} ${i}`,
            value: i
        });
    }
    return options;
}

export async function getCourseProgramOptions(courseId) {
    const course = await optionsRepository.getCourseProgramData(courseId);
    if (!course) {
        throw new Error('Course not found');
    }

    const plain = course.get({ plain: true });
    const duration = Number(plain.courseDuration) || 0;

    const options = [];
    for (let year = 1; year <= duration; year++) {
        options.push({
            label: `Year ${year}`,
            value: year,
        });
    }

    return options;
}

export async function getClassSectionOptions(courseId, term, sessionId, year) {
    return await optionsRepository.getClassSectionOptions(courseId, term, sessionId, year);
}

export async function getSpecializationOptions(courseId) {
    return await optionsRepository.getSpecializationOptions(courseId);
}

export async function getSubjectOptions(courseId, term, academicYearId, sessionId, userId) {
    let resolvedAcademicYearId = academicYearId;

    if (sessionId != null) {
        const session = await scoped(model.sessionModel).findOne({
            where: { sessionId: Number(sessionId) },
            attributes: ['sessionId', 'academicYearId'],
        });
        if (!session) {
            throw new Error('Session not found');
        }
        resolvedAcademicYearId = session.academicYearId;

        if (courseId != null) {
            const mapping = await optionsRepository.findSessionCourseMappingByCourseAndSession(
                Number(courseId),
                Number(sessionId),
            );
            if (!mapping) {
                throw new Error('Session is not mapped to this course');
            }
        }
    }

    return await optionsRepository.getSubjectOptions(
        courseId,
        term,
        resolvedAcademicYearId,
        userId,
        sessionId,
    );
}

export async function getTeacherOptions(campusId, subjectId) {
    return await optionsRepository.getTeacherOptions(campusId, subjectId);
}

export async function getTimeTableStructureOptions() {
    return await optionsRepository.getTimeTableStructureOptions();
}

export async function getFeePlanOptions(filters) {
    const empty = { courseSessionId: null, profiles: [] };
    const { courseId, sessionId } = filters;
    if (!courseId || !sessionId) {
        return empty;
    }

    const { courseSessionId, rows } = await optionsRepository.getFeePlanProfileOptions(
        Number(courseId),
        Number(sessionId),
    );

    return {
        courseSessionId,
        profiles: rows.map((row) => ({
            feePlanProfileId: row.feePlanProfileId,
            name: row.name,
        })),
    };
}

export async function getLectureWindowOptions(userId, employeeId, subjectId, academicYearId, date, sessionId) {
    const employee = await optionsRepository.getEmployeeOptionDetail({ userId, employeeId });
    if (!employee) {
        throw new Error('Employee not found');
    }
    if (employee.userId == null) {
        throw new Error('Employee has no linked userId');
    }

    const [subject, options] = await Promise.all([
        optionsRepository.getSubjectOptionDetail(subjectId),
        optionsRepository.getLectureWindowOptionRows({
            userId: employee.userId,
            subjectId,
            academicYearId,
            date,
            sessionId,
        }),
    ]);

    if (!subject) {
        throw new Error('Subject not found');
    }

    return {
        selected: { employee, subject },
        options,
    };
}

export async function getLessonOptions(lectureWindowId, academicYearId) {
    const [lectureWindow, options] = await Promise.all([
        optionsRepository.getLectureWindowOptionDetail(lectureWindowId, academicYearId),
        optionsRepository.getLessonOptionRows({ lectureWindowId, academicYearId }),
    ]);

    if (!lectureWindow) {
        throw new Error('Lecture window not found');
    }

    return {
        selected: { lectureWindow },
        options,
    };
}

export async function getTopicOptions(lessonId, academicYearId) {
    const [lesson, options] = await Promise.all([
        optionsRepository.getLessonOptionDetail(lessonId, academicYearId),
        optionsRepository.getTopicOptionRows(lessonId),
    ]);

    if (!lesson) {
        throw new Error('Lesson not found');
    }

    return {
        selected: { lesson },
        options,
    };
}

function buildYearOptionsFromCourses(courses) {
    let maxDuration = 0;
    for (const course of courses) {
        const duration = Number(course.courseDuration) || 0;
        if (duration > maxDuration) {
            maxDuration = duration;
        }
    }

    const options = [];
    for (let year = 1; year <= maxDuration; year++) {
        options.push({
            label: `Year ${year}`,
            value: year,
        });
    }
    return options;
}

function buildYearOptionsFromDistinctRows(rows) {
    const options = [];
    for (const row of rows) {
        const year = Number(row.year);
        if (!Number.isFinite(year) || year <= 0) {
            continue;
        }
        options.push({
            label: `Year ${year}`,
            value: year,
        });
    }
    return options;
}

function buildTermOptionsFromCourses(courses) {
    const byValue = new Map();
    for (const course of courses) {
        const plain = typeof course.get === 'function' ? course.get({ plain: true }) : course;
        const termOptions = buildCourseTermOptions(plain);
        for (const opt of termOptions) {
            if (byValue.has(opt.term)) {
                continue;
            }
            byValue.set(opt.term, {
                label: opt.termName,
                value: opt.term,
            });
        }
    }

    const options = [];
    for (const opt of byValue.values()) {
        options.push(opt);
    }
    options.sort((a, b) => a.value - b.value);
    return options;
}

/**
 * Cascading student filter options for multi-select parents.
 * courseIds → sessions / years / terms / classSections
 * sessionIds + year + term further narrow classSections.
 */
export async function getStudentFilterOptions(filters) {
    const { courseIds, sessionIds, year, term } = filters;

    const [courses, sessions, coursesMeta, classSectionYearRows, classSections, structures] = await Promise.all([
        optionsRepository.getCourseOptions(),
        optionsRepository.getSessionOptions(courseIds),
        courseIds != null
            ? optionsRepository.getCoursesMeta(courseIds)
            : Promise.resolve([]),
        courseIds != null || sessionIds != null
            ? optionsRepository.getDistinctClassSectionYears({ courseIds, sessionIds })
            : Promise.resolve([]),
        optionsRepository.getClassSectionFilterOptions({
            courseIds,
            sessionIds,
            year,
            term,
        }),
        courseIds != null
            ? optionsRepository.getStructureFilterOptions({ courseIds, sessionIds })
            : Promise.resolve([]),
    ]);

    let years = buildYearOptionsFromDistinctRows(classSectionYearRows);
    if (years.length === 0 && coursesMeta.length > 0) {
        years = buildYearOptionsFromCourses(coursesMeta);
    }

    const terms = courseIds != null
        ? buildTermOptionsFromCourses(coursesMeta)
        : [];

    return {
        courses,
        sessions,
        years,
        classSections,
        terms,
        structures,
        studentStatuses: STUDENT_STATUS_OPTIONS,
    };
}
