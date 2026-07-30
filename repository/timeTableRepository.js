import { Op, fn, col } from 'sequelize';
import * as model from '../models/index.js'
import { buildScope, scoped } from '../utility/scoped.js';
import sequelize from '../database/sequelizeConfig.js';

const excludeMeta = ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];

const structureInclude = (extra = {}) => ({
    model: model.timeTableStructureModel,
    as: 'timeTableName',
    required: true,
    attributes: ['name', 'instituteId', 'academicYearId'],
    where: buildScope(model.timeTableStructureModel),
    ...extra,
});

async function findPeriodInScope(timeTableCreationId) {
    const scopeWhere = buildScope(model.timeTableStructureModel);
    if (!scopeWhere.instituteId || !scopeWhere.academicYearId) {
        return null;
    }

    return await model.timeTableStructurePeriodsModel.findOne({
        where: { timeTableCreationId },
        include: [structureInclude()],
    });
}

export async function buildTimeTableStructureCreatePayload(data) {
    const scopeWhere = buildScope(model.timeTableStructureModel);
    if (!scopeWhere.universityId || !scopeWhere.instituteId || !scopeWhere.academicYearId) {
        throw new Error('universityId, instituteId and academicYearId are required in request context');
    }

    return {
        name: data.name,
        maximumPeriod: data.maximumPeriod,
        periodLength: data.periodLength,
        periodGap: data.periodGap,
        startingTime: data.startingTime,
        weekOff: data.weekOff,
        sourceTimeTableNameId: data.sourceTimeTableNameId ?? null,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        universityId: scopeWhere.universityId,
        instituteId: scopeWhere.instituteId,
        academicYearId: scopeWhere.academicYearId,
    };
}

export async function addTimeTableName(data, transaction) {
    const payload = await buildTimeTableStructureCreatePayload(data);
    return await scoped(model.timeTableStructureModel).create(payload, { transaction });
}

export async function addTimeTable(data, transaction) {
    return await model.timeTableStructurePeriodsModel.bulkCreate(data.timeSlots, { transaction });
}

export async function getTimeTableStructureById(timeTableNameId, options = {}) {
    return await scoped(model.timeTableStructureModel).findByPk(Number(timeTableNameId), {
        attributes: [
            'timeTableNameId',
            'universityId',
            'instituteId',
            'academicYearId',
        ],
        transaction: options.transaction,
    });
}

export async function findStructureInScope(timeTableNameId, options = {}) {
    return await scoped(model.timeTableStructureModel).findOne({
        where: { timeTableNameId: Number(timeTableNameId) },
        attributes: [
            'timeTableNameId',
            'maximumPeriod',
            'periodLength',
            'periodGap',
            'startingTime',
        ],
        transaction: options.transaction,
    });
}

export async function getStructureCourseMappingById(timetableStructureCourseMapperId, options = {}) {
    return await scoped(model.timeTableStructureCourseModel).findByPk(
      timetableStructureCourseMapperId,
      {
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
            'academicGroupScopeId',
            'universityId',
            'instituteId',
            'academicYearId',
            'sessionId',
            'startingDate',
            'endingDate',
        ],
        transaction: options.transaction,
      },
    );
}

export async function getStructureCourseMapping(timeTableNameId, courseId, sessionId, options = {}) {
    return await scoped(model.timeTableStructureCourseModel).findOne({
        where: {
            timeTableNameId,
            courseId,
            sessionId,
        },
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
            'academicGroupScopeId',
            'universityId',
            'instituteId',
            'academicYearId',
            'sessionId',
            'startingDate',
            'endingDate',
        ],
        transaction: options.transaction,
    });
}

export async function getStructureScopeMapping(timeTableNameId, academicGroupScopeId, sessionId, options = {}) {
    return await scoped(model.timeTableStructureCourseModel).findOne({
        where: {
            timeTableNameId,
            academicGroupScopeId,
            sessionId,
        },
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
            'academicGroupScopeId',
            'universityId',
            'instituteId',
            'academicYearId',
            'sessionId',
            'startingDate',
            'endingDate',
        ],
        transaction: options.transaction,
    });
}

export async function findOverlappingStructureCourseMapping({
    courseId,
    academicGroupScopeId,
    sessionId,
    startingDate,
    endingDate,
    excludeMapperId = null,
}, options = {}) {
    const where = {
        startingDate: { [Op.lte]: endingDate },
        endingDate: { [Op.gte]: startingDate },
    };

    if (academicGroupScopeId != null) {
        where.academicGroupScopeId = Number(academicGroupScopeId);
    } else if (courseId != null) {
        where.courseId = Number(courseId);
    }

    if (sessionId != null) {
        where.sessionId = Number(sessionId);
    }

    if (excludeMapperId != null) {
        where.timetableStructureCourseMapperId = { [Op.ne]: Number(excludeMapperId) };
    }

    return await scoped(model.timeTableStructureCourseModel).findOne({
        where,
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
            'academicGroupScopeId',
            'sessionId',
            'startingDate',
            'endingDate',
        ],
        transaction: options.transaction,
    });
}

export async function addStructureCourseMapping(data, transaction) {
    return await scoped(model.timeTableStructureCourseModel).create(data, { transaction });
}

export async function getRoutineDateBoundsForMapper(timetableStructureCourseMapperId) {
    const row = await scoped(model.timeTableRoutineModel).findOne({
        where: {
            timetableStructureCourseMapperId,
        },
        attributes: [
            [fn('MIN', col('starting_date')), 'minStartingDate'],
            [fn('MAX', col('ending_date')), 'maxEndingDate'],
        ],
        raw: true,
    });

    return {
        minStartingDate: row ? row.minStartingDate : null,
        maxEndingDate: row ? row.maxEndingDate : null,
    };
}

export async function findRoutineByStructureCourseMapperId(timetableStructureCourseMapperId) {
    return await scoped(model.timeTableRoutineModel).findOne({
        where: { timetableStructureCourseMapperId: Number(timetableStructureCourseMapperId) },
        attributes: ['timeTableRoutineId'],
    });
}

export async function deleteStructureCourseMappingById(timetableStructureCourseMapperId) {
    const mapping = await getStructureCourseMappingById(timetableStructureCourseMapperId);
    if (!mapping) {
        throw new Error('Course mapping not found');
    }

    const routineUsingMapping = await findRoutineByStructureCourseMapperId(
        timetableStructureCourseMapperId,
    );
    if (routineUsingMapping) {
        throw new Error('Course mapping is used in a routine and cannot be deleted');
    }

    await scoped(model.timeTableStructureCourseModel).destroy({
        where: { timetableStructureCourseMapperId: Number(timetableStructureCourseMapperId) },
    });

    return {
        message: `structure course mapping deleted successfully for timetableStructureCourseMapperId ${timetableStructureCourseMapperId}`,
        timetableStructureCourseMapperId: Number(timetableStructureCourseMapperId),
        courseId: mapping.courseId,
        timeTableNameId: mapping.timeTableNameId,
        sessionId: mapping.sessionId,
    };
}

export async function updateStructureCourseMappingById(timetableStructureCourseMapperId, updates, previousCourseId) {
    await scoped(model.timeTableStructureCourseModel).update(updates, {
        where: {
            timetableStructureCourseMapperId,
        },
    });

    if (updates.courseId !== previousCourseId) {
        await scoped(model.timeTableRoutineModel).update(
            {
                courseId: updates.courseId,
                updatedBy: updates.updatedBy,
            },
            {
                where: {
                    timetableStructureCourseMapperId,
                },
            },
        );
    }

    return getStructureCourseMappingById(timetableStructureCourseMapperId);
}

export async function getStructurePeriodsByStructureId(timeTableNameId, options = {}) {
    return await model.timeTableStructurePeriodsModel.findAll({
        where: { timeTableNameId: Number(timeTableNameId) },
        attributes: [
            'timeTableCreationId',
            'periodName',
            'startTime',
            'endTime',
            'type',
            'isCourse',
            'isBreak',
        ],
        order: [['timeTableCreationId', 'ASC']],
        transaction: options.transaction,
    });
}

export async function addTimeTablePeriodRow(data, transaction) {
    return await model.timeTableStructurePeriodsModel.create(data, { transaction });
}

export async function incrementStructureMaximumPeriod(timeTableNameId, transaction) {
    const structure = await findStructureInScope(timeTableNameId, { transaction });
    if (!structure) {
        return null;
    }

    const plain = structure.get ? structure.get({ plain: true }) : structure;
    const currentMax = Number(plain.maximumPeriod) || 0;

    await scoped(model.timeTableStructureModel).update(
        { maximumPeriod: currentMax + 1 },
        {
            where: { timeTableNameId: Number(timeTableNameId) },
            transaction,
        },
    );

    return currentMax + 1;
}

const structureListInclude = [
    {
        model: model.timeTableStructureCourseModel,
        as: "courseMappings",
        attributes: {
            exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy"],
        },
        include: [
            {
                model: model.courseModel,
                as: "course",
                attributes: ["courseId", "courseName", "courseCode"],
                required: false,
            },
            {
                model: model.sessionModel,
                as: "session",
                attributes: [
                    "sessionId",
                    "sessionName",
                    "startingDate",
                    "endingDate",
                    "classTillDate",
                    "academicYearId",
                    "instituteId",
                ],
                required: false,
            },
        ],
    },
    {
        model: model.timeTableStructurePeriodsModel,
        as: "timeTableName",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
];

export async function getTimeTableStructures(filters = {}) {
    const mappingInclude = {
        model: model.timeTableStructureCourseModel,
        as: "courseMappings",
        attributes: {
            exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy"],
        },
        required: false,
        include: [
            {
                model: model.courseModel,
                as: "course",
                attributes: ["courseId", "courseName", "courseCode"],
                required: false,
            },
            {
                model: model.sessionModel,
                as: "session",
                attributes: [
                    "sessionId",
                    "sessionName",
                    "startingDate",
                    "endingDate",
                    "classTillDate",
                    "academicYearId",
                    "instituteId",
                ],
                required: false,
            },
        ],
    };

    const mappingWhere = {};
    if (filters.courseId != null) {
        mappingWhere.courseId = Number(filters.courseId);
        mappingInclude.required = true;
    }
    if (filters.sessionId != null) {
        mappingWhere.sessionId = Number(filters.sessionId);
        mappingInclude.required = true;
    }
    if (Object.keys(mappingWhere).length > 0) {
        mappingInclude.where = mappingWhere;
    }

    return await scoped(model.timeTableStructureModel).findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy"] },
        include: [
            mappingInclude,
            {
                model: model.timeTableStructurePeriodsModel,
                as: "timeTableName",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
        ],
    });
}

export async function getTimeTableStructureDetailsById(timeTableNameId) {
    return await scoped(model.timeTableStructureModel).findOne({
        where: { timeTableNameId: Number(timeTableNameId) },
        attributes: { exclude: ["createdAt", "updatedAt", "createdBy", "updatedBy"] },
        include: structureListInclude,
    });
}

export async function getStructureMappingPrintRows(filters = {}) {
    const where = {};
    if (filters.timetableStructureCourseMapperId != null) {
        where.timetableStructureCourseMapperId = Number(filters.timetableStructureCourseMapperId);
    }
    if (filters.timeTableNameId != null) {
        where.timeTableNameId = Number(filters.timeTableNameId);
    }
    if (filters.courseId != null) {
        where.courseId = Number(filters.courseId);
    }
    if (filters.academicGroupScopeId != null) {
        where.academicGroupScopeId = Number(filters.academicGroupScopeId);
    }
    if (filters.sessionId != null) {
        where.sessionId = Number(filters.sessionId);
    }

    return await scoped(model.timeTableStructureCourseModel).findAll({
        where,
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
            'academicGroupScopeId',
            'sessionId',
            'startingDate',
            'endingDate',
        ],
        include: [
            {
                model: model.timeTableStructureModel,
                as: 'timeTableStructure',
                required: false,
                attributes: [
                    'timeTableNameId',
                    'name',
                    'maximumPeriod',
                    'periodLength',
                    'periodGap',
                    'startingTime',
                    'weekOff',
                ],
                where: buildScope(model.timeTableStructureModel),
            },
            {
                model: model.courseModel,
                as: 'course',
                required: false,
                attributes: ['courseId', 'courseName', 'courseCode'],
            },
            {
                model: model.academicGroupScopeModel,
                as: 'academicGroupScope',
                required: false,
                attributes: ['academicGroupScopeId', 'title', 'groupType', 'selectionScope'],
            },
            {
                model: model.sessionModel,
                as: 'session',
                required: false,
                attributes: ['sessionId', 'sessionName'],
            },
        ],
        order: [
            ['timeTableNameId', 'ASC'],
            ['timetableStructureCourseMapperId', 'ASC'],
        ],
    });
}

export async function getMappedStructuresForCourseSession(courseId, sessionId, academicGroupScopeId = null) {
    const where = {};
    if (academicGroupScopeId != null) {
        where.academicGroupScopeId = Number(academicGroupScopeId);
    } else if (courseId != null) {
        where.courseId = Number(courseId);
        if (sessionId != null) {
            where.sessionId = Number(sessionId);
        }
    } else {
        return [];
    }

    return await scoped(model.timeTableStructureCourseModel).findAll({
        where,
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
            'academicGroupScopeId',
            'sessionId',
            'startingDate',
            'endingDate',
        ],
        include: [
            {
                model: model.timeTableStructureModel,
                as: 'timeTableStructure',
                required: true,
                attributes: [
                    'timeTableNameId',
                    'name',
                    'maximumPeriod',
                    'periodLength',
                    'periodGap',
                    'startingTime',
                    'weekOff',
                ],
                where: buildScope(model.timeTableStructureModel),
                include: [
                    {
                        model: model.timeTableStructurePeriodsModel,
                        as: 'timeTableName',
                        attributes: [
                            'timeTableCreationId',
                            'periodName',
                            'startTime',
                            'endTime',
                            'type',
                            'isCourse',
                            'isBreak',
                        ],
                    },
                ],
            },
            {
                model: model.courseModel,
                as: 'course',
                required: false,
                attributes: ['courseId', 'courseName', 'courseCode'],
            },
            {
                model: model.sessionModel,
                as: 'session',
                required: false,
                attributes: ['sessionId', 'sessionName'],
            },
        ],
        order: [
            ['timeTableNameId', 'ASC'],
            ['timetableStructureCourseMapperId', 'ASC'],
        ],
    });
}

export async function getSingleTimeTableById(timeTableCreationId) {
    const period = await findPeriodInScope(timeTableCreationId);
    if (!period) {
        return [];
    }

    return [period];
}

export async function updateTimeTable(timeTableCreationId, info) {
    const period = await findPeriodInScope(timeTableCreationId);
    if (!period) {
        throw new Error('Time table period not found for this institute and academic year');
    }

    const updateData = {};
    if (info.startTime !== undefined) updateData.startTime = info.startTime;
    if (info.endTime !== undefined) updateData.endTime = info.endTime;
    if (info.periodName !== undefined) updateData.periodName = info.periodName;
    if (info.isCourse !== undefined) updateData.isCourse = info.isCourse;
    if (info.isBreak !== undefined) updateData.isBreak = info.isBreak;
    if (info.type !== undefined) updateData.type = info.type;

    return await model.timeTableStructurePeriodsModel.update(updateData, {
        where: { timeTableCreationId },
    });
}

async function findBlockingScheduleForPeriod(timeTableCreationId) {
    const now = new Date();

    return await model.timeTableCellModel.findOne({
        where: { timeTableCreationId },
        attributes: ['timeTableCellId'],
        include: [{
            model: model.timeTableRoutineModel,
            as: 'timeTableRoutine',
            required: true,
            attributes: ['timeTableRoutineId'],
            where: {
                ...buildScope(model.timeTableRoutineModel),
                [Op.or]: [
                    { isPublish: true },
                    {
                        startingDate: { [Op.lte]: now },
                        endingDate: { [Op.gte]: now },
                    },
                ],
            },
        }],
    });
}

export async function deleteTimeTable(timeTableCreationId) {
    const period = await findPeriodInScope(timeTableCreationId);
    if (!period) {
        throw new Error('Time table period not found for this institute and academic year');
    }

    const scheduleUsingPeriod = await findBlockingScheduleForPeriod(timeTableCreationId);
    if (scheduleUsingPeriod) {
        throw new Error('Time table period is used in an active or published routine and cannot be deleted');
    }

    await model.timeTableStructurePeriodsModel.destroy({
        where: { timeTableCreationId },
        individualHooks: true,
    });

    return { message: `time table creation deleted successfully for time Table Creation Id ${timeTableCreationId}` };
}

export async function deleteTimeTableName(timeTableNameId) {
    const structure = await getTimeTableStructureById(timeTableNameId);
    if (!structure) {
        throw new Error('Time table structure not found for this institute and academic year');
    }

    const mappedProgram = await scoped(model.timeTableStructureCourseModel).findOne({
        where: { timeTableNameId: Number(timeTableNameId) },
        attributes: ['timetableStructureCourseMapperId'],
    });

    if (mappedProgram) {
        throw new Error('Time table structure cannot be deleted because a program/course is mapped to it');
    }

    const transaction = await sequelize.transaction();

    try {
        await scoped(model.timeTableStructureModel).update(
            { sourceTimeTableNameId: null },
            {
                where: { sourceTimeTableNameId: Number(timeTableNameId) },
                transaction,
            },
        );

        await model.timeTableStructurePeriodsModel.destroy({
            where: { timeTableNameId: Number(timeTableNameId) },
            individualHooks: true,
            transaction,
        });

        await scoped(model.timeTableStructureModel).destroy({
            where: { timeTableNameId: Number(timeTableNameId) },
            transaction,
        });

        const result = {
            message: `time table structure deleted successfully for time Table Name Id ${timeTableNameId}`,
        };

        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getTimetableListPrintRows(filters = {}) {
    const where = {
        classSectionTermId: { [Op.not]: null }
    };
    
    // Optional filters if passed
    if (filters.timeTableNameId != null) {
        where['$structureCourseMapping.time_table_name_id$'] = Number(filters.timeTableNameId);
    }
    if (filters.courseId != null) {
        where.courseId = Number(filters.courseId);
    }
    if (filters.sessionId != null) {
        where['$structureCourseMapping.session_id$'] = Number(filters.sessionId);
    }

    const rows = await scoped(model.timeTableRoutineModel).findAll({
        attributes: [
            [sequelize.fn('MAX', sequelize.col('structureCourseMapping.time_table_name_id')), 'timeTableNameId'],
            [
                sequelize.fn('GROUP_CONCAT', sequelize.literal('DISTINCT `structureCourseMapping->timeTableStructure`.`name` SEPARATOR ", "')),
                'structureName'
            ],
            [
                sequelize.fn('GROUP_CONCAT', sequelize.literal('DISTINCT CONCAT_WS(" - ", `structureCourseMapping->timeTableStructure`.`name`, `timeTableCourse`.`course_code`) SEPARATOR ", "')),
                'structure'
            ],
            'courseId',
            [sequelize.col('timeTableCourse.course_name'), 'courseName'],
            [sequelize.col('timeTableCourse.course_code'), 'courseCode'],
            [sequelize.col('structureCourseMapping.session_id'), 'sessionId'],
            [sequelize.col('structureCourseMapping.session.session_name'), 'sessionName'],
            'classSectionTermId',
            [sequelize.col('timeTableClassSectionTerm.term'), 'term'],
            [sequelize.col('timeTableCourse.term_type'), 'termType'],
            [sequelize.col('timeTableClassSectionTerm.classSection.class_sections_id'), 'classSectionId'],
            [sequelize.col('timeTableClassSectionTerm.classSection.section'), 'classSection'],
            [sequelize.literal('NULL'), 'academicGroupId'],
            [sequelize.literal('NULL'), 'academicGroupTitle'],
            [sequelize.literal('NULL'), 'scopeTitle'],
            [sequelize.literal('NULL'), 'groupCode'],
            [sequelize.literal('NULL'), 'scopeCode'],
            [sequelize.fn('MIN', sequelize.col('time_table_routine.starting_date')), 'startingDate'],
            [sequelize.fn('MAX', sequelize.col('time_table_routine.ending_date')), 'endingDate'],
            [
                sequelize.literal(`(
                    SELECT COUNT(DISTINCT csm.student_id)
                    FROM class_student_mapper AS csm
                    WHERE csm.class_section_term_id = time_table_routine.class_section_term_id
                    
                )`),
                'totalStudent'
            ],
            [
                sequelize.literal(`(
                    SELECT COUNT(DISTINCT tsm.user_id)
                    FROM teacher_section_mapping AS tsm
                    INNER JOIN class_section_term AS cst2 ON cst2.class_sections_id = tsm.class_sections_id
                    WHERE cst2.class_section_term_id = time_table_routine.class_section_term_id
                    
                )`),
                'facultyCount'
            ],
            [sequelize.fn('COUNT', sequelize.col('time_table_routine.time_table_routine_id')), 'routinesCount'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.is_publish = 0 OR time_table_routine.is_publish IS NULL THEN 1 ELSE 0 END) AS SIGNED)'), 'draftRoutine'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.is_publish = 1 THEN 1 ELSE 0 END) AS SIGNED)'), 'publishedRoutine'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.starting_date <= CURRENT_DATE() THEN 1 ELSE 0 END) AS SIGNED)'), 'completedRunningRoutine'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.starting_date > CURRENT_DATE() THEN 1 ELSE 0 END) AS SIGNED)'), 'upcomingRoutine']
        ],
        where,
        include: [
            {
                model: model.timeTableStructureCourseModel,
                as: 'structureCourseMapping',
                attributes: [],
                required: true,
                include: [
                    {
                        model: model.sessionModel,
                        as: 'session',
                        attributes: [],
                        required: true
                    },
                    {
                        model: model.timeTableStructureModel,
                        as: 'timeTableStructure',
                        attributes: [],
                        required: true
                    }
                ]
            },
            {
                model: model.courseModel,
                as: 'timeTableCourse',
                attributes: [],
                required: true
            },
            {
                model: model.classSectionTermModel,
                as: 'timeTableClassSectionTerm',
                attributes: [],
                required: true,
                include: [
                    {
                        model: model.classSectionModel,
                        as: 'classSection',
                        attributes: [],
                        required: true
                    }
                ]
            }
        ],
        group: [
            'structureCourseMapping.session_id',
            'structureCourseMapping->session.session_id',
            'timeTableCourse.course_id',
            'timeTableClassSectionTerm.class_section_term_id',
            'timeTableClassSectionTerm->classSection.class_sections_id',
            'time_table_routine.course_id',
            'time_table_routine.class_section_term_id'
        ],
        raw: true,
        order: [
            [sequelize.fn('MAX', sequelize.col('structureCourseMapping.time_table_name_id')), 'ASC'],
            ['courseId', 'ASC'],
        ]
    });

    const academicWhere = {
        academicGroupId: { [Op.not]: null }
    };
    
    // Optional filters if passed
    if (filters.timeTableNameId != null) {
        academicWhere['$structureCourseMapping.time_table_name_id$'] = Number(filters.timeTableNameId);
    }
    if (filters.courseId != null) {
        academicWhere.courseId = Number(filters.courseId);
    }
    if (filters.sessionId != null) {
        academicWhere['$structureCourseMapping.session_id$'] = Number(filters.sessionId);
    }

    const academicRows = await scoped(model.timeTableRoutineModel).findAll({
        attributes: [
            [sequelize.fn('MAX', sequelize.col('structureCourseMapping.time_table_name_id')), 'timeTableNameId'],
            [
                sequelize.fn('GROUP_CONCAT', sequelize.literal('DISTINCT `structureCourseMapping->timeTableStructure`.`name` SEPARATOR ", "')),
                'structureName'
            ],
            [
                sequelize.fn('GROUP_CONCAT', sequelize.literal('DISTINCT CONCAT_WS(" - ", `structureCourseMapping->timeTableStructure`.`name`, `timeTableCourse`.`course_code`, CONCAT("Scope: ", `academicGroup->scope`.`title`), CONCAT("Group: ", `academicGroup`.`group_code`)) SEPARATOR ", "')),
                'structure'
            ],
            'courseId',
            [sequelize.col('timeTableCourse.course_name'), 'courseName'],
            [sequelize.col('timeTableCourse.course_code'), 'courseCode'],
            [sequelize.col('structureCourseMapping.session_id'), 'sessionId'],
            [sequelize.col('structureCourseMapping.session.session_name'), 'sessionName'],
            'academicGroupId',
            [sequelize.col('academicGroup->scope.term'), 'term'],
            [sequelize.col('timeTableCourse.term_type'), 'termType'],
            [sequelize.literal('NULL'), 'classSectionId'],
            [sequelize.literal('NULL'), 'classSection'],
            [sequelize.col('academicGroup.group_name'), 'academicGroupTitle'],
            [sequelize.col('academicGroup->scope.title'), 'scopeTitle'],
            [sequelize.col('academicGroup.group_code'), 'groupCode'],
            [sequelize.col('academicGroup->scope.scope_code'), 'scopeCode'],
            [sequelize.fn('MIN', sequelize.col('time_table_routine.starting_date')), 'startingDate'],
            [sequelize.fn('MAX', sequelize.col('time_table_routine.ending_date')), 'endingDate'],
            [
                sequelize.literal(`(
                    SELECT COUNT(DISTINCT ags.student_id)
                    FROM academic_group_student AS ags
                    WHERE ags.academic_group_id = time_table_routine.academic_group_id
                )`),
                'totalStudent'
            ],
            [
                sequelize.literal(`(
                    SELECT COUNT(DISTINCT agu.user_id)
                    FROM academic_group_user AS agu
                    WHERE agu.academic_group_id = time_table_routine.academic_group_id
                )`),
                'facultyCount'
            ],
            [sequelize.fn('COUNT', sequelize.col('time_table_routine.time_table_routine_id')), 'routinesCount'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.is_publish = 0 OR time_table_routine.is_publish IS NULL THEN 1 ELSE 0 END) AS SIGNED)'), 'draftRoutine'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.is_publish = 1 THEN 1 ELSE 0 END) AS SIGNED)'), 'publishedRoutine'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.starting_date <= CURRENT_DATE() THEN 1 ELSE 0 END) AS SIGNED)'), 'completedRunningRoutine'],
            [sequelize.literal('CAST(SUM(CASE WHEN time_table_routine.starting_date > CURRENT_DATE() THEN 1 ELSE 0 END) AS SIGNED)'), 'upcomingRoutine']
        ],
        where: academicWhere,
        include: [
            {
                model: model.timeTableStructureCourseModel,
                as: 'structureCourseMapping',
                attributes: [],
                required: true,
                include: [
                    {
                        model: model.sessionModel,
                        as: 'session',
                        attributes: [],
                        required: true
                    },
                    {
                        model: model.timeTableStructureModel,
                        as: 'timeTableStructure',
                        attributes: [],
                        required: true
                    }
                ]
            },
            {
                model: model.courseModel,
                as: 'timeTableCourse',
                attributes: [],
                required: true
            },
            {
                model: model.academicGroupModel,
                as: 'academicGroup',
                attributes: [],
                required: true,
                include: [
                    {
                        model: model.academicGroupScopeModel,
                        as: 'scope',
                        attributes: [],
                        required: true
                    }
                ]
            }
        ],
        group: [
            'structureCourseMapping.session_id',
            'structureCourseMapping->session.session_id',
            'timeTableCourse.course_id',
            'academicGroup.academic_group_id',
            'academicGroup->scope.academic_group_scope_id',
            'time_table_routine.course_id',
            'time_table_routine.academic_group_id'
        ],
        raw: true,
        order: [
            [sequelize.fn('MAX', sequelize.col('structureCourseMapping.time_table_name_id')), 'ASC'],
            ['courseId', 'ASC'],
        ]
    });

    let combinedRows = [...rows, ...academicRows];

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        combinedRows = combinedRows.filter(row => 
            (row.academicGroupTitle && row.academicGroupTitle.toLowerCase().includes(searchLower)) ||
            (row.classSection && row.classSection.toLowerCase().includes(searchLower))
        );
    }

    if (filters.page && filters.limit) {
        const page = parseInt(filters.page, 10);
        const limit = parseInt(filters.limit, 10);
        const startIndex = (page - 1) * limit;
        const paginatedRows = combinedRows.slice(startIndex, startIndex + limit);
        return {
            data: paginatedRows,
            total: combinedRows.length,
            page,
            limit
        };
    }

    return {
        data: combinedRows,
        total: combinedRows.length
    };
}

export async function getProgramsOverviewRows(filters = {}) {
    const where = buildScope(model.courseModel, { scopeConfig: { academicYear: false } });
    
    if (filters.instituteId) where.instituteId = filters.instituteId;
    
    return await model.courseModel.findAll({
        where,
        attributes: ['courseId', 'courseName', 'courseCode'],
        include: [
            {
                model: model.classSectionModel,
                as: 'courseSection',
                required: false,
                attributes: ['classSectionsId', 'sessionId'],
                where: buildScope(model.classSectionModel),
            },
            {
                model: model.academicGroupScopeModel,
                as: 'academicGroupScopes',
                required: false,
                attributes: ['academicGroupScopeId', 'sessionId'],
                where: buildScope(model.academicGroupScopeModel),
            },
            {
                model: model.timeTableRoutineModel,
                as: 'timeTableCourse',
                required: false,
                attributes: ['timeTableRoutineId', 'isPublish'],
                where: buildScope(model.timeTableRoutineModel),
                include: [
                    {
                        model: model.timeTableStructureCourseModel,
                        as: 'structureCourseMapping',
                        required: false,
                        attributes: ['sessionId'],
                    }
                ]
            }
        ]
    });
}
