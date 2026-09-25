import * as model from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { scoped, buildScope } from '../utility/scoped.js';
import { ROLES } from '../const/roles.js';
import { classSectionTermsInclude } from '../utility/classSectionIncludes.js';
import { getAcademicYearId } from '../utility/requestContext.js';
import * as acedmicYearRepository from './acedmicYearRepository.js';

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

export async function getMyCourseOptions(courseLevelId, userId) {
    const courseIds = new Set();

    const mappingRows = await scoped(model.teacherSubjectMappingModel).findAll({
        attributes: ['subjectId'],
        where: { userId: Number(userId) },
        include: [{
            model: model.subjectModel,
            as: 'employeeSubject',
            attributes: ['courseId'],
            required: true,
        }],
    });

    for (const row of mappingRows) {
      const plain = row.get ? row.get({ plain: true }) : row;
      if (plain.employeeSubject?.courseId != null) {
        courseIds.add(Number(plain.employeeSubject.courseId));
      }
    }

    const cellTeachers = await scoped(model.timeTableCellTeachersModel).findAll({
        attributes: [],
        where: { userId: Number(userId) },
        include: [{
            model: model.timeTableCellModel,
            as: 'timeTableCell',
            attributes: [],
            required: true,
            include: [{
                model: model.timeTableRoutineModel,
                as: 'timeTableRoutine',
                attributes: ['courseId'],
                required: true,
            }],
        }],
        raw: true,
    });

    for (const row of cellTeachers) {
        const courseId = row['timeTableCell.timeTableRoutine.courseId']
            || row.timeTableCell?.timeTableRoutine?.courseId;
        if (courseId != null) {
            courseIds.add(Number(courseId));
        }
    }

    if (courseIds.size === 0) {
        return [];
    }

    return scoped(model.courseModel).findAll({
        attributes: [['course_name', 'label'], ['course_id', 'value']],
        where: {
            courseId: { [Op.in]: [...courseIds] },
            ...(courseLevelId != null && { course_levelId: Number(courseLevelId) }),
        },
        order: [['course_name', 'ASC']],
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

export async function getClassSectionOptions(courseId, term, sessionId, year, batchId) {
    return await scoped(model.classSectionModel).findAll({
        attributes: [
            ['section', 'label'],
            ['class_sections_id', 'value'],
            'year',
        ],
        where: {
            ...(courseId && { courseId }),
            ...(sessionId && { sessionId }),
            ...(batchId && { batchId: Number(batchId) }),
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

async function findSubjectIdsFromTeacherMapping(userId, courseId) {
    const mappingRows = await scoped(model.teacherSubjectMappingModel).findAll({
        attributes: ['subjectId'],
        where: { userId: Number(userId) },
        include: [{
            model: model.subjectModel,
            as: 'employeeSubject',
            attributes: ['subjectId'],
            required: true,
            where: {
                ...(courseId != null && { courseId: Number(courseId) }),
                ...buildScope(model.subjectModel),
            },
        }],
    });

    const subjectIds = [];
    const seen = new Set();
    for (const row of mappingRows) {
        const plain = row.get({ plain: true });
        const subjectId = Number(plain.subjectId);
        if (!subjectId || seen.has(subjectId)) {
            continue;
        }
        seen.add(subjectId);
        subjectIds.push(subjectId);
    }
    return subjectIds;
}

async function findSubjectIdsFromTimeTableCells(userId, courseId, term, sessionId) {
    const sectionRequired = term != null || sessionId != null;
    const classSectionRequired = sessionId != null;

    const cellRows = await model.timeTableCellModel.findAll({
        attributes: ['timeTableCellId', 'subjectId'],
        where: {
            subjectId: { [Op.ne]: null },
        },
        include: [
            {
                model: model.timeTableCellTeachersModel,
                as: 'timeTableCellTeachers',
                required: true,
                attributes: ['userId'],
                where: { userId: Number(userId) },
            },
            {
                model: model.timeTableRoutineModel,
                as: 'timeTableRoutine',
                required: true,
                attributes: ['timeTableRoutineId', 'courseId'],
                where: {
                    ...buildScope(model.timeTableRoutineModel),
                    ...(courseId != null && { courseId: Number(courseId) }),
                },
                include: [{
                    model: model.classSectionTermModel,
                    as: 'timeTableClassSectionTerm',
                    attributes: ['classSectionTermId', 'term'],
                    required: sectionRequired,
                    where: {
                        ...(term != null && { term: Number(term) }),
                    },
                    include: [{
                        model: model.classSectionModel,
                        as: 'classSection',
                        attributes: ['classSectionsId', 'sessionId'],
                        required: classSectionRequired,
                        where: {
                            ...(sessionId != null && { sessionId: Number(sessionId) }),
                            ...(sessionId != null ? buildScope(model.classSectionModel) : {}),
                        },
                    }],
                }],
            },
        ],
    });

    const subjectIds = [];
    const seen = new Set();
    for (const row of cellRows) {
        const plain = row.get({ plain: true });
        const subjectId = Number(plain.subjectId);
        if (!subjectId || seen.has(subjectId)) {
            continue;
        }
        seen.add(subjectId);
        subjectIds.push(subjectId);
    }
    return subjectIds;
}

export async function getSubjectOptions(courseId, term, academicYearId, userId, sessionId = null, unmapped = false) {
    let targetCurriculumIds = [];
    let hasCurriculumFilter = false;

    let calendarYear = null;
    let resolvedAcademicYearId = academicYearId || getAcademicYearId();

    if (sessionId != null) {
        const session = await scoped(model.sessionModel).findOne({
            where: { sessionId: Number(sessionId) },
            attributes: ['sessionId', 'academicYearId'],
        });
        if (session && session.academicYearId) {
            resolvedAcademicYearId = session.academicYearId;
        }
    }

    if (resolvedAcademicYearId) {
        const ay = await acedmicYearRepository.getSingleacedmicYearDetails(resolvedAcademicYearId);
        if (ay?.startingDate) {
            calendarYear = Number(String(ay.startingDate).slice(0, 4));
        }
    }

    let sessionBatchIds = null;
    if (sessionId != null) {
        const batches = await scoped(model.batchModel).findAll({
            where: { sessionId: Number(sessionId) },
            attributes: ['batchId'],
        });
        sessionBatchIds = batches.map((b) => b.batchId);
    }

    const cbmWhere = {};
    if (sessionBatchIds != null) {
        if (sessionBatchIds.length === 0) {
            return [];
        }
        cbmWhere.batchId = { [Op.in]: sessionBatchIds };
    }

    if (courseId != null) {
        const curriculums = await scoped(model.curriculumModel).findAll({
            where: { courseId: Number(courseId) },
            attributes: ['curriculumId'],
        });
        const courseCurriculumIds = curriculums.map((c) => c.curriculumId);
        if (courseCurriculumIds.length === 0) {
            return [];
        }
        cbmWhere.curriculumId = { [Op.in]: courseCurriculumIds };
    }

    const batchMappings = await scoped(model.curriculumBatchMappingModel).findAll({
        where: cbmWhere,
        attributes: ['curriculumBatchMappingId', 'curriculumId', 'batchId'],
    });

    const cbmIds = batchMappings.map((m) => m.curriculumBatchMappingId);

    if (cbmIds.length > 0) {
        const termMappingWhere = {
            curriculumBatchMappingId: { [Op.in]: cbmIds },
        };
        if (calendarYear) {
            termMappingWhere.year = calendarYear;
        }
        if (term != null && !unmapped) {
            termMappingWhere.term = Number(term);
        }

        const activeTermRows = await scoped(model.curriculumBatchTermMappingModel).findAll({
            where: termMappingWhere,
            attributes: ['curriculumBatchMappingId', 'term', 'year'],
        });

        if (activeTermRows.length > 0) {
            const activeCbmIds = new Set(activeTermRows.map((r) => r.curriculumBatchMappingId));
            const filteredMappings = batchMappings.filter((m) => activeCbmIds.has(m.curriculumBatchMappingId));
            targetCurriculumIds = Array.from(new Set(filteredMappings.map((m) => m.curriculumId)));
            hasCurriculumFilter = true;
        } else {
            targetCurriculumIds = Array.from(new Set(batchMappings.map((m) => m.curriculumId)));
            hasCurriculumFilter = true;
        }
    } else if (courseId != null) {
        const curriculums = await scoped(model.curriculumModel).findAll({
            where: { courseId: Number(courseId) },
            attributes: ['curriculumId'],
        });
        targetCurriculumIds = curriculums.map((c) => c.curriculumId);
        hasCurriculumFilter = true;
    }

    let subjectIdsFromCurriculum = null;
    if (hasCurriculumFilter || (term != null && !unmapped)) {
        const termMappingWhere = {};
        if (targetCurriculumIds.length > 0) {
            termMappingWhere.curriculumId = { [Op.in]: targetCurriculumIds };
        }
        if (term != null && !unmapped) {
            termMappingWhere.term = Number(term);
        }

        const termMappings = await scoped(model.curriculumSubjectTermMappingModel).findAll({
            where: termMappingWhere,
            attributes: ['subjectId'],
        });
        subjectIdsFromCurriculum = Array.from(new Set(termMappings.map((tm) => tm.subjectId)));
    }

    let allowedSubjectIds = subjectIdsFromCurriculum;

    if (userId != null) {
        const mappedSubjectIds = await findSubjectIdsFromTeacherMapping(userId, courseId);
        const timetableSubjectIds = await findSubjectIdsFromTimeTableCells(
            userId,
            courseId,
            term,
            sessionId,
        );

        const teacherSubjectIds = Array.from(new Set([...mappedSubjectIds, ...timetableSubjectIds]));

        if (allowedSubjectIds != null) {
            allowedSubjectIds = teacherSubjectIds.filter((id) => allowedSubjectIds.includes(id));
        } else {
            allowedSubjectIds = teacherSubjectIds;
        }
    }

    const whereClause = {
        ...(courseId != null && { courseId: Number(courseId) }),
        ...(unmapped && { term: null }),
    };

    if (allowedSubjectIds != null) {
        if (allowedSubjectIds.length === 0) {
            return [];
        }
        whereClause.subjectId = { [Op.in]: allowedSubjectIds };
    }

    return scoped(model.subjectModel).findAll({
        attributes: [['subject_name', 'label'], ['subject_id', 'value']],
        where: whereClause,
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
                // where: { isTeacher: true },
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
    const session = await scoped(model.sessionModel).findOne({
        attributes: ["sessionId", "courseId"],
        where: { sessionId: Number(sessionId) },
    });
    if (!session) return null;
    if (session.courseId && Number(session.courseId) === Number(courseId)) {
        return session;
    }
    const batchCount = await scoped(model.batchModel).count({
        where: { sessionId: Number(sessionId) },
        include: [
            {
                model: model.curriculumBatchMappingModel,
                as: "curriculumMappings",
                required: true,
                include: [
                    {
                        model: model.curriculumModel,
                        as: "curriculum",
                        required: true,
                        where: { courseId: Number(courseId) },
                    },
                ],
            },
        ],
    });
    if (batchCount > 0) return session;
    return session;
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

export async function getLectureWindowOptionDetail(lectureWindowId, academicYearId, userId) {
    const where = {
        lectureWindowId: Number(lectureWindowId),
        academicYearId: Number(academicYearId),
    };
    if (userId != null) {
        where.userId = Number(userId);
    }

    return scoped(model.lectureWindowModel).findOne({
        raw: true,
        nest: true,
        attributes: lectureWindowOptionAttributes,
        where,
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
                attributes: ['sessionId', 'sessionName'],
            },
        ],
    });
}

export async function getLessonOptionRows(filters) {
    const where = {
        lectureWindowId: Number(filters.lectureWindowId),
        academicYearId: Number(filters.academicYearId),
    };
    if (filters.userId != null) {
        where.userId = Number(filters.userId);
    }

    return scoped(model.lessonModel).findAll({
        raw: true,
        nest: true,
        attributes: ['lessonId', 'name'],
        where,
        order: [['lessonId', 'ASC']],
    });
}

export async function getLessonOptionDetail(lessonId, academicYearId, userId) {
    const where = {
        lessonId: Number(lessonId),
        academicYearId: Number(academicYearId),
    };
    if (userId != null) {
        where.userId = Number(userId);
    }

    return scoped(model.lessonModel).findOne({
        raw: true,
        nest: true,
        attributes: lessonOptionAttributes,
        where,
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

/**
 * Structure options for student filters using timeTableStructureCourseModel.
 * Only fetched when courseIds is provided (related to courseId + sessionId).
 */
export async function getStructureFilterOptions({ courseIds, sessionIds } = {}) {
    if (courseIds == null) {
        return [];
    }

    const where = {
        courseId: idListWhere(courseIds),
    };
    const sessionIdFilter = idListWhere(sessionIds);
    if (sessionIdFilter != null) {
        where.sessionId = sessionIdFilter;
    }

    const rows = await scoped(model.timeTableStructureCourseModel).findAll({
        where: {
            ...where,
            ...buildScope(model.timeTableStructureCourseModel),
        },
        include: [{
            model: model.timeTableStructureModel,
            as: 'timeTableStructure',
            attributes: ['timeTableNameId', 'name'],
            required: false,
        }],
        order: [['timeTableNameId', 'ASC']],
    });

    const structures = [];
    const seen = new Set();

    for (const row of rows) {
        const timeTableNameId = row.timeTableNameId;
        if (!timeTableNameId || seen.has(timeTableNameId)) continue;
        seen.add(timeTableNameId);

        const name = row.timeTableStructure ? row.timeTableStructure.name : `Structure ${timeTableNameId}`;
        structures.push({
            label: name,
            value: timeTableNameId,
        });
    }

    return structures;
}
