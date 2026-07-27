import * as model from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { scoped, buildScope } from '../utility/scoped.js';
import { ROLES } from '../const/roles.js';
import { classSectionTermsInclude } from '../utility/classSectionIncludes.js';

export async function getAffiliatedUniversityOptions() {
    return await scoped(model.affiliatedIniversityModel).findAll({
        attributes: [['affiliated_university_name', 'label'], ['affiliated_university_id', 'value']],
    });
}

export async function getCourseOptions(courseLevelId) {
    return await scoped(model.courseModel).findAll({
        attributes: [['course_name', 'label'], ['course_id', 'value']],
        where: {
            ...(courseLevelId != null && { course_levelId: Number(courseLevelId) }),
        },
    });
}

export async function getCourseData(courseId) {
    return await scoped(model.courseModel).findByPk(courseId, {
        attributes: ['totalTerms', 'termType'],
    });
}

export async function getCourseProgramData(courseId) {
    return await scoped(model.courseModel).findByPk(courseId, {
        attributes: ['courseDuration', 'totalTerms', 'termType'],
    });
}

export async function getClassSectionOptions(courseId, term, sessionId, year) {
    return await scoped(model.classSectionModel).findAll({
        attributes: [
            ['section', 'label'],
            ['class_sections_id', 'value'],
            'year',
        ],
        where: {
            ...(courseId && { courseId }),
            ...(sessionId && { sessionId }),
            ...(year != null && { year: Number(year) }),
        },
        include: [classSectionTermsInclude({ term, required: term != null })],
    });
}

export async function getSpecializationOptions(courseId) {
    return await scoped(model.specializationModel).findAll({
        attributes: [['specialization_name', 'label'], ['specialization_id', 'value']],
        where: {
            ...(courseId && { course_Id: courseId }),
        },
    });
}

export async function getSubjectOptions(courseId, term, academicYearId, userId) {
    const subjectWhere = {
        ...(courseId != null && { courseId: Number(courseId) }),
        ...(term != null && { term: Number(term) }),
        ...(academicYearId != null && { academicYearId: Number(academicYearId) }),
    };

    // Teacher dropdown: subjects of course (+ session year) mapped to userId
    if (userId != null) {
        const mappingRows = await scoped(model.teacherSubjectMappingModel).findAll({
            attributes: ['subjectId'],
            where: { userId: Number(userId) },
        });

        const mappedSubjectIds = [];
        for (const row of mappingRows) {
            mappedSubjectIds.push(Number(row.subjectId));
        }
        if (mappedSubjectIds.length === 0) {
            return [];
        }

        return scoped(model.subjectModel).findAll({
            attributes: [['subject_name', 'label'], ['subject_id', 'value']],
            where: {
                ...subjectWhere,
                subjectId: { [Op.in]: mappedSubjectIds },
            },
            order: [['subject_name', 'ASC']],
        });
    }

    const mappedRows = await scoped(model.classSubjectMapperModel).findAll({
        attributes: ['subjectId'],
        include: [{
            model: model.subjectModel,
            as: 'subjects',
            attributes: [],
            required: true,
            where: {
                ...subjectWhere,
                ...buildScope(model.subjectModel),
            },
        }],
    });

    const classMappedSubjectIds = [];
    for (const row of mappedRows) {
        classMappedSubjectIds.push(Number(row.subjectId));
    }
    const uniqueClassMappedIds = [...new Set(classMappedSubjectIds)];

    return scoped(model.subjectModel).findAll({
        attributes: [['subject_name', 'label'], ['subject_id', 'value']],
        where: {
            ...subjectWhere,
            ...(uniqueClassMappedIds.length > 0 && {
                subjectId: { [Op.notIn]: uniqueClassMappedIds },
            }),
        },
        order: [['subject_name', 'ASC']],
    });
}

export async function getTeacherOptions(campusId, subjectId) {
    const employeeWhere = {
        ...(campusId != null && { campusId: Number(campusId) }),
    };

    if (subjectId != null) {
        const mappingRows = await scoped(model.teacherSubjectMappingModel).findAll({
            attributes: ['userId'],
            where: { subjectId: Number(subjectId) },
        });

        const userIds = [];
        for (const row of mappingRows) {
            userIds.push(Number(row.userId));
        }
        if (userIds.length === 0) {
            return [];
        }
        employeeWhere.userId = { [Op.in]: userIds };
    }

    return await scoped(model.employeeModel).findAll({
        attributes: [
            ['employee_name', 'label'],
            [Sequelize.col('user.user_id'), 'value'],
            ['employee_id', 'employeeId'],
        ],
        where: employeeWhere,
        include: [
            {
                model: model.userModel,
                as: 'user',
                attributes: [],
                required: true,
                where: { isTeacher: true },
            },
        ],
    });
}

export async function getTimeTableStructureOptions() {
    return scoped(model.timeTableStructureModel).findAll({
        attributes: [['name', 'label'], ['time_table_name_id', 'value']],
        order: [['name', 'ASC'], ['time_table_name_id', 'ASC']],
    });
}

export async function findSessionCourseMappingByCourseAndSession(
    courseId,
    sessionId,
) {
    return scoped(model.sessionCouseMappingModel).findOne({
        attributes: ["sessionCourseMappingId"],
        where: { courseId, sessionId },
    });
}

/** V2 fee plan profiles for course + session (via session_course_mapping). */
export async function getFeePlanProfileOptions(courseId, sessionId) {
    const mapping = await findSessionCourseMappingByCourseAndSession(
        courseId,
        sessionId,
    );
    if (!mapping) {
        return { courseSessionId: null, rows: [] };
    }

    const courseSessionId = mapping.get("sessionCourseMappingId");
    const rows = await scoped(model.feePlanProfileModel).findAll({
        attributes: ["feePlanProfileId", "name"],
        where: { courseSessionId, publishStatus: "published" },
        order: [["feePlanProfileId", "ASC"]],
    });

    return { courseSessionId, rows };
}

const lectureWindowOptionAttributes = [
    'lectureWindowId',
    'name',
    'description',
    'startDate',
    'endDate',
    'subjectId',
    'userId',
    'sessionId',
];

const lessonOptionAttributes = [
    'lessonId',
    'name',
    'description',
    'lectureWindowId',
    'subjectId',
    'userId',
    'sessionId',
];

export async function getEmployeeOptionDetail({ userId, employeeId }) {
    const where = userId != null
        ? { userId: Number(userId) }
        : { employeeId: Number(employeeId) };

    return scoped(model.employeeModel).findOne({
        raw: true,
        nest: true,
        where,
        attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
    });
}

export async function getSubjectOptionDetail(subjectId) {
    return scoped(model.subjectModel).findOne({
        raw: true,
        nest: true,
        where: { subjectId: Number(subjectId) },
        attributes: ['subjectId', 'subjectName', 'courseId', 'term'],
    });
}

export async function getLectureWindowOptionRows(filters) {
    const where = {
        academicYearId: Number(filters.academicYearId),
        userId: Number(filters.userId),
        subjectId: Number(filters.subjectId),
        startDate: { [Op.lte]: filters.date },
        endDate: { [Op.gte]: filters.date },
    };

    if (filters.sessionId != null) {
        where.sessionId = Number(filters.sessionId);
    }

    return scoped(model.lectureWindowModel).findAll({
        raw: true,
        nest: true,
        attributes: ['lectureWindowId', 'name'],
        where,
        order: [['startDate', 'DESC'], ['lectureWindowId', 'DESC']],
    });
}

export async function getLectureWindowOptionDetail(lectureWindowId, academicYearId) {
    return scoped(model.lectureWindowModel).findOne({
        raw: true,
        nest: true,
        attributes: lectureWindowOptionAttributes,
        where: {
            lectureWindowId: Number(lectureWindowId),
            academicYearId: Number(academicYearId),
        },
        include: [
            {
                model: model.subjectModel,
                as: 'lectureWindowSubject',
                attributes: ['subjectId', 'subjectName', 'courseId'],
            },
            {
                model: model.employeeModel,
                as: 'lectureWindowEmployee',
                attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
            },
            {
                model: model.sessionModel,
                as: 'lectureWindowSession',
                attributes: ['sessionId', 'sessionName', 'startingDate', 'endingDate'],
            },
        ],
    });
}

export async function getLessonOptionRows(filters) {
    return scoped(model.lessonModel).findAll({
        raw: true,
        nest: true,
        attributes: ['lessonId', 'name'],
        where: {
            lectureWindowId: Number(filters.lectureWindowId),
            academicYearId: Number(filters.academicYearId),
        },
        order: [['lessonId', 'ASC']],
    });
}

export async function getLessonOptionDetail(lessonId, academicYearId) {
    return scoped(model.lessonModel).findOne({
        raw: true,
        nest: true,
        attributes: lessonOptionAttributes,
        where: {
            lessonId: Number(lessonId),
            academicYearId: Number(academicYearId),
        },
        include: [
            {
                model: model.lectureWindowModel,
                as: 'lectureWindow',
                attributes: lectureWindowOptionAttributes,
            },
            {
                model: model.subjectModel,
                as: 'lessonSubject',
                attributes: ['subjectId', 'subjectName', 'courseId'],
            },
        ],
    });
}

export async function getTopicOptionRows(lessonId) {
    return scoped(model.topicModel).findAll({
        attributes: ['topicId', 'name'],
        where: { lessonId: Number(lessonId) },
        include: [{
            model: model.subTopicModel,
            as: 'subTopic',
            attributes: ['subTopicId', 'name'],
            required: false,
        }],
        order: [['topicId', 'ASC']],
    });
}

function idListWhere(ids) {
    if (ids == null) {
        return undefined;
    }
    if (ids.length === 1) {
        return ids[0];
    }
    return { [Op.in]: ids };
}

/** Sessions for cascading student filters; optional courseIds via session_course_mapping. */
export async function getSessionOptions(courseIds) {
    if (courseIds != null) {
        const mappings = await scoped(model.sessionCouseMappingModel).findAll({
            attributes: ['sessionId'],
            where: { courseId: idListWhere(courseIds) },
        });

        const sessionIds = [];
        const seen = new Set();
        for (const row of mappings) {
            const sessionId = Number(row.sessionId);
            if (seen.has(sessionId)) {
                continue;
            }
            seen.add(sessionId);
            sessionIds.push(sessionId);
        }

        if (sessionIds.length === 0) {
            return [];
        }

        return scoped(model.sessionModel).findAll({
            attributes: [['session_name', 'label'], ['session_id', 'value']],
            where: { sessionId: { [Op.in]: sessionIds } },
            order: [['session_name', 'ASC']],
        });
    }

    return scoped(model.sessionModel).findAll({
        attributes: [['session_name', 'label'], ['session_id', 'value']],
        order: [['session_name', 'ASC']],
    });
}

/** Course metadata used to build year / term option lists. */
export async function getCoursesMeta(courseIds) {
    const where = {};
    const courseIdFilter = idListWhere(courseIds);
    if (courseIdFilter != null) {
        where.courseId = courseIdFilter;
    }

    return scoped(model.courseModel).findAll({
        attributes: ['courseId', 'courseDuration', 'totalTerms', 'termType'],
        where,
        order: [['courseId', 'ASC']],
    });
}

/** Distinct program years from class_sections matching parent filters. */
export async function getDistinctClassSectionYears({ courseIds, sessionIds } = {}) {
    const where = {};
    const courseIdFilter = idListWhere(courseIds);
    const sessionIdFilter = idListWhere(sessionIds);
    if (courseIdFilter != null) {
        where.courseId = courseIdFilter;
    }
    if (sessionIdFilter != null) {
        where.sessionId = sessionIdFilter;
    }

    return scoped(model.classSectionModel).findAll({
        attributes: ['year'],
        where,
        group: ['year'],
        order: [['year', 'ASC']],
        raw: true,
    });
}

/**
 * Class section options for cascading student filters (multi-id parents).
 * Requires at least one courseId (same contract as /options/classSections).
 */
export async function getClassSectionFilterOptions({
    courseIds,
    sessionIds,
    year,
    term,
} = {}) {
    if (courseIds == null) {
        return [];
    }

    const where = {
        courseId: idListWhere(courseIds),
    };
    const sessionIdFilter = idListWhere(sessionIds);
    const yearFilter = idListWhere(year);
    if (sessionIdFilter != null) {
        where.sessionId = sessionIdFilter;
    }
    if (yearFilter != null) {
        where.year = yearFilter;
    }

    return scoped(model.classSectionModel).findAll({
        attributes: [
            ['section', 'label'],
            ['class_sections_id', 'value'],
            'year',
        ],
        where,
        include: [classSectionTermsInclude({ term, required: term != null })],
        order: [['year', 'ASC'], ['section', 'ASC']],
    });
}
