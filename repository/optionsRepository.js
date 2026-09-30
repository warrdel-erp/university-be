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
            ...(courseId != null && { courseId: Number(courseId) }),
            ...(sessionId != null && { sessionId: Number(sessionId) }),
            ...(batchId != null && { batchId: Number(batchId) }),
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

async function findSubjectIdsFromTimeTableCells(userId, courseId, term, sessionId, options = {}) {
    const { batchId, year, classSectionsId, classSectionTermId } = options;

    const classSectionWhere = {
        ...buildScope(model.classSectionModel),
        ...(sessionId != null && { sessionId: Number(sessionId) }),
        ...(batchId != null ? { batchId: Number(batchId) } : { batchId: { [Op.ne]: null } }),
        ...(year != null && { year: Number(year) }),
        ...(classSectionsId != null && { classSectionsId: Number(classSectionsId) }),
    };

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
                attributes: ['timeTableRoutineId', 'courseId', 'classSectionTermId'],
                where: {
                    ...buildScope(model.timeTableRoutineModel, { scopeConfig: { academicYear: false } }),
                    ...(courseId != null && { courseId: Number(courseId) }),
                    ...(classSectionTermId != null && { classSectionTermId: Number(classSectionTermId) }),
                },
                include: [{
                    model: model.classSectionTermModel,
                    as: 'timeTableClassSectionTerm',
                    attributes: ['classSectionTermId', 'term', 'classSectionsId'],
                    required: true,
                    where: {
                        ...(term != null && { term: Number(term) }),
                        ...(classSectionTermId != null && { classSectionTermId: Number(classSectionTermId) }),
                    },
                    include: [{
                        model: model.classSectionModel,
                        as: 'classSection',
                        attributes: ['classSectionsId', 'sessionId', 'batchId', 'year', 'courseId'],
                        required: true,
                        where: classSectionWhere,
                    }],
                }],
            },
        ],
    });

    const subjectIds = [];
    const seenSubjects = new Set();
    const batchIds = [];
    const seenBatches = new Set();
    const classSectionIds = [];
    const seenClassSections = new Set();

    for (const row of cellRows) {
        const plain = row.get({ plain: true });
        const subjectId = Number(plain.subjectId);
        if (subjectId && !seenSubjects.has(subjectId)) {
            seenSubjects.add(subjectId);
            subjectIds.push(subjectId);
        }

        const cs = plain.timeTableRoutine?.timeTableClassSectionTerm?.classSection;
        const resolvedBatchId = Number(cs?.batchId);
        if (resolvedBatchId && !seenBatches.has(resolvedBatchId)) {
            seenBatches.add(resolvedBatchId);
            batchIds.push(resolvedBatchId);
        }

        const resolvedClassSectionId = Number(cs?.classSectionsId);
        if (resolvedClassSectionId && !seenClassSections.has(resolvedClassSectionId)) {
            seenClassSections.add(resolvedClassSectionId);
            classSectionIds.push(resolvedClassSectionId);
        }
    }

    return { subjectIds, batchIds, classSectionIds };
}

export async function getSubjectOptions(courseId, term, userId, sessionId = null, unmapped = false, options = {}) {
    const { batchId, year, classSectionsId, classSectionTermId, curriculumId } = options;

    const subjectWhere = {
        ...(courseId != null && { courseId: Number(courseId) }),
    };

    if (unmapped) {
        subjectWhere.term = null;
    }

    if (userId != null) {
        const {
            subjectIds: timetableSubjectIds,
            batchIds: timetableBatchIds,
            classSectionIds: timetableClassSectionIds,
        } = await findSubjectIdsFromTimeTableCells(
            userId,
            courseId,
            term,
            sessionId,
            { batchId, year, classSectionsId, classSectionTermId },
        );

        if (timetableSubjectIds.length === 0 || timetableBatchIds.length === 0) {
            return [];
        }

        const effectiveBatchWhere = batchId != null
            ? { batchId: Number(batchId) }
            : { batchId: timetableBatchIds.length === 1 ? timetableBatchIds[0] : { [Op.in]: timetableBatchIds } };

        const effectiveClassSectionWhere = {
            ...buildScope(model.classSectionModel),
            ...(classSectionsId != null
                ? { classSectionsId: Number(classSectionsId) }
                : { classSectionsId: timetableClassSectionIds.length === 1 ? timetableClassSectionIds[0] : { [Op.in]: timetableClassSectionIds } }),
            ...(sessionId != null && { sessionId: Number(sessionId) }),
            ...(year != null && { year: Number(year) }),
        };

        const queryIncludes = [
            {
                model: model.curriculumSubjectTermMappingModel,
                as: 'curriculumTermMappings',
                attributes: [],
                required: true,
                ...(term != null && !unmapped && { where: { term: Number(term) } }),
                include: [
                    {
                        model: model.curriculumModel,
                        as: 'curriculum',
                        attributes: [],
                        required: true,
                        where: {
                            ...buildScope(model.curriculumModel),
                            ...(courseId != null && { courseId: Number(courseId) }),
                            ...(curriculumId != null && { curriculumId: Number(curriculumId) }),
                        },
                        include: [
                            {
                                model: model.curriculumBatchMappingModel,
                                as: 'batchMappings',
                                attributes: [],
                                required: true,
                                where: effectiveBatchWhere,
                                include: [
                                    {
                                        model: model.batchModel,
                                        as: 'batch',
                                        attributes: [],
                                        required: true,
                                        ...(sessionId != null && { where: { sessionId: Number(sessionId) } }),
                                        include: [
                                            {
                                                model: model.classSectionModel,
                                                as: 'classSections',
                                                attributes: [],
                                                required: true,
                                                where: effectiveClassSectionWhere,
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ];

        return scoped(model.subjectModel).findAll({
            attributes: [['subject_name', 'label'], ['subject_id', 'value']],
            include: queryIncludes,
            where: {
                subjectId: { [Op.in]: timetableSubjectIds },
                ...subjectWhere,
            },
            group: ['subject.subject_id', 'subject.subject_name'],
            order: [['subject_name', 'ASC']],
        });
    }

    if (
        !unmapped &&
        (batchId != null ||
            classSectionsId != null ||
            classSectionTermId != null ||
            curriculumId != null ||
            sessionId != null ||
            year != null ||
            term != null ||
            courseId != null)
    ) {
        const classSectionTermInclude =
            term != null || classSectionTermId != null
                ? [
                      {
                          model: model.classSectionTermModel,
                          as: 'classSectionTerms',
                          attributes: [],
                          required: true,
                          where: {
                              ...(term != null && { term: Number(term) }),
                              ...(classSectionTermId != null && { classSectionTermId: Number(classSectionTermId) }),
                          },
                      },
                  ]
                : [];

        return scoped(model.subjectModel).findAll({
            attributes: [['subject_name', 'label'], ['subject_id', 'value']],
            where: {
                isActive: true,
                ...subjectWhere,
            },
            include: [
                {
                    model: model.curriculumSubjectTermMappingModel,
                    as: 'curriculumTermMappings',
                    attributes: [],
                    required: true,
                    ...(term != null && { where: { term: Number(term) } }),
                    include: [
                        {
                            model: model.curriculumModel,
                            as: 'curriculum',
                            attributes: [],
                            required: true,
                            where: {
                                ...buildScope(model.curriculumModel),
                                isActive: true,
                                ...(courseId != null && { courseId: Number(courseId) }),
                                ...(curriculumId != null && { curriculumId: Number(curriculumId) }),
                            },
                            include: [
                                {
                                    model: model.curriculumBatchMappingModel,
                                    as: 'batchMappings',
                                    attributes: [],
                                    required: true,
                                    ...(batchId != null && { where: { batchId: Number(batchId) } }),
                                    include: [
                                        {
                                            model: model.batchModel,
                                            as: 'batch',
                                            attributes: [],
                                            required: true,
                                            ...(sessionId != null && { where: { sessionId: Number(sessionId) } }),
                                            include: [
                                                {
                                                    model: model.classSectionModel,
                                                    as: 'classSections',
                                                    attributes: [],
                                                    required: true,
                                                    where: {
                                                        ...buildScope(model.classSectionModel),
                                                        ...(classSectionsId != null && { classSectionsId: Number(classSectionsId) }),
                                                        ...(courseId != null && { courseId: Number(courseId) }),
                                                        ...(sessionId != null && { sessionId: Number(sessionId) }),
                                                        ...(year != null && { year: Number(year) }),
                                                    },
                                                    include: classSectionTermInclude,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            group: ['subject.subject_id', 'subject.subject_name'],
            order: [['subject_name', 'ASC']],
        });
    }

    return scoped(model.subjectModel).findAll({
        attributes: [['subject_name', 'label'], ['subject_id', 'value']],
        where: subjectWhere,
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
        userId: Number(filters.userId),
        subjectId: Number(filters.subjectId),
        startDate: { [Op.lte]: filters.date },
        endDate: { [Op.gte]: filters.date },
    };

    if (filters.sessionId != null) {
        where.sessionId = Number(filters.sessionId);
    }

    return scoped(model.lectureWindowModel, { scopeConfig: { academicYear: false } }).findAll({
        raw: true,
        nest: true,
        attributes: ['lectureWindowId', 'name'],
        where,
        order: [['startDate', 'DESC'], ['lectureWindowId', 'DESC']],
    });
}

export async function getLectureWindowOptionDetail(lectureWindowId, userId) {
    const where = {
        lectureWindowId: Number(lectureWindowId),
    };
    if (userId != null) {
        where.userId = Number(userId);
    }

    return scoped(model.lectureWindowModel, { scopeConfig: { academicYear: false } }).findOne({
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
    };
    if (filters.userId != null) {
        where.userId = Number(filters.userId);
    }

    return scoped(model.lessonModel, { scopeConfig: { academicYear: false } }).findAll({
        raw: true,
        nest: true,
        attributes: ['lessonId', 'name'],
        where,
        order: [['lessonId', 'ASC']],
    });
}

export async function getLessonOptionDetail(lessonId, userId) {
    const where = {
        lessonId: Number(lessonId),
    };
    if (userId != null) {
        where.userId = Number(userId);
    }

    return scoped(model.lessonModel, { scopeConfig: { academicYear: false } }).findOne({
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
