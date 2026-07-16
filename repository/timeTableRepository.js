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
    if (filters.sessionId != null) {
        where.sessionId = Number(filters.sessionId);
    }

    return await scoped(model.timeTableStructureCourseModel).findAll({
        where,
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
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
            },
            {
                model: model.courseModel,
                as: 'course',
                required: true,
                attributes: ['courseId', 'courseName', 'courseCode'],
            },
            {
                model: model.sessionModel,
                as: 'session',
                required: true,
                attributes: ['sessionId', 'sessionName'],
            },
        ],
        order: [
            ['timeTableNameId', 'ASC'],
            ['courseId', 'ASC'],
            ['sessionId', 'ASC'],
        ],
    });
}

export async function getMappedStructuresForCourseSession(courseId, sessionId) {
    return await scoped(model.timeTableStructureCourseModel).findAll({
        where: {
            courseId: Number(courseId),
            sessionId: Number(sessionId),
        },
        attributes: [
            'timetableStructureCourseMapperId',
            'timeTableNameId',
            'courseId',
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
                required: true,
                attributes: ['courseId', 'courseName', 'courseCode'],
            },
            {
                model: model.sessionModel,
                as: 'session',
                required: true,
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

    return await scoped(model.classScheduleModel).findOne({
        where: { timeTableCreationId },
        attributes: ['timeTableMappingId'],
        include: [{
            model: model.timeTableRoutineModel,
            as: 'timeTablecreate',
            required: true,
            attributes: ['timeTableRoutineId'],
            where: {
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
