import { Op } from 'sequelize';
import * as model from '../models/index.js'
import { getTenantStore } from '../utility/requestContext.js';
import { buildScope, scoped } from '../utility/scoped.js';
import sequelize from '../database/sequelizeConfig.js';

const excludeMeta = ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];

const structureInclude = (extra = {}) => ({
    model: model.timeTableStructureModel,
    as: 'timeTableName',
    required: true,
    attributes: ['name', 'courseId', 'instituteId', 'academicYearId'],
    where: buildScope(model.timeTableStructureModel),
    include: [
        {
            model: model.courseModel,
            as: 'timeTableStructureCourse',
            attributes: ['courseId', 'courseName'],
        },
    ],
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

export async function getCourseInScope(courseId) {
    const store = getTenantStore();
    if (!store?.universityId || !store?.instituteId || !courseId) {
        return null;
    }

    return await scoped(model.courseModel).findOne({
        where: {
            courseId,
            universityId: store.universityId,
            instituteId: store.instituteId,
        },
        attributes: ['courseId'],
    });
}

export async function buildTimeTableStructureCreatePayload(data, transaction) {
    const scopeWhere = buildScope(model.timeTableStructureModel);
    if (!scopeWhere.universityId || !scopeWhere.instituteId || !scopeWhere.academicYearId) {
        throw new Error('universityId, instituteId and academicYearId are required in request context');
    }

    const course = await getCourseInScope(data.courseId);
    if (!course) {
        throw new Error('Course not found for this university and institute');
    }

    return {
        name: data.name,
        maximumPeriod: data.maximumPeriod,
        courseId: data.courseId,
        periodLength: data.periodLength,
        periodGap: data.periodGap,
        startingTime: data.startingTime,
        weekOff: data.weekOff,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        universityId: scopeWhere.universityId,
        instituteId: scopeWhere.instituteId,
        academicYearId: scopeWhere.academicYearId,
    };
}

export async function addTimeTableName(data, transaction) {
    try {
        const payload = await buildTimeTableStructureCreatePayload(data, transaction);
        return await scoped(model.timeTableStructureModel).create(payload, { transaction });
    } catch (error) {
        console.error("Error in create time table name:", error);
        throw error;
    }
}

export async function addTimeTable(data, transaction) {
    try {
        const result = await model.timeTableStructurePeriodsModel.bulkCreate(data.timeSlots, { transaction });
        return result;
    } catch (error) {
        console.error("Error in create time table:", error);
        throw error;
    }
}

export async function getTimeTableStructureById(timeTableNameId, options = {}) {
    try {
        return await scoped(model.timeTableStructureModel).findByPk(Number(timeTableNameId), {
            attributes: ['timeTableNameId', 'courseId', 'sessionId'],
            transaction: options.transaction,
        });
    } catch (error) {
        console.error('Error in getting time table structure by id:', error);
        throw error;
    }
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
    try {
        return await model.timeTableStructurePeriodsModel.create(data, { transaction });
    } catch (error) {
        console.error('Error in create time table period:', error);
        throw error;
    }
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

export async function getTimeTableStructures({ courseId } = {}) {
    try {
        const where = {};
        if (courseId) {
            where.courseId = Number(courseId);
        }

        const rows = await scoped(model.timeTableStructureModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where,
            include: [
                {
                    model: model.sessionModel,
                    as: "timeTableSession",
                    attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate", "academicYearId", "instituteId"],
                    required: false,
                },
                {
                    model: model.timeTableStructurePeriodsModel,
                    as: "timeTableName",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.courseModel,
                    as: "timeTableStructureCourse",
                    attributes: ["courseId", "courseName", "courseCode", "termType"],
                    required: false,
                },
            ],
        });

        const result = [];
        for (const row of rows) {
            const plain = row.get({ plain: true });
            const course = plain.timeTableStructureCourse;
            plain.termType = course ? course.termType : null;
            result.push(plain);
        }
        return result;
    } catch (error) {
        console.error('Error in getting time table:', error);
        throw error;
    }
}

export async function getSingleTimeTableById(timeTableCreationId) {
    try {
        const period = await findPeriodInScope(timeTableCreationId);
        if (!period) {
            return [];
        }

        return [period];
    } catch (error) {
        console.error('Error in getting time table by id:', error);
        throw error;
    }
}

export async function updateTimeTable(timeTableCreationId, info) {
    try {
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
    } catch (error) {
        console.error(`Error updating time table ${timeTableCreationId}:`, error);
        throw error;
    }
}

async function findBlockingRoutine(timeTableNameId) {
    const now = new Date();

    return await scoped(model.timeTableRoutineModel).findOne({
        where: {
            timeTableNameId,
            [Op.or]: [
                { isPublish: true },
                {
                    startingDate: { [Op.lte]: now },
                    endingDate: { [Op.gte]: now },
                },
            ],
        },
        attributes: ['timeTableRoutineId'],
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

    try {
        await model.timeTableStructurePeriodsModel.destroy({
            where: { timeTableCreationId },
            individualHooks: true,
        });

        return { message: `time table creation deleted successfully for time Table Creation Id ${timeTableCreationId}` };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
}

export async function deleteTimeTableStructure(timeTableNameId) {
    const structure = await getTimeTableStructureById(timeTableNameId);
    if (!structure) {
        throw new Error('Time table structure not found for this institute and academic year');
    }

    const routineUsingStructure = await findBlockingRoutine(timeTableNameId);
    if (routineUsingStructure) {
        throw new Error('Time table structure is used in an active or published routine and cannot be deleted');
    }

    const transaction = await sequelize.transaction();
    try {
        await model.timeTableStructurePeriodsModel.destroy({
            where: { timeTableNameId },
            individualHooks: true,
            transaction,
        });

        await scoped(model.timeTableStructureModel).destroy({
            where: { timeTableNameId },
            individualHooks: true,
            transaction,
        });

        await transaction.commit();
        return { message: `time table structure deleted successfully for time Table Name Id ${timeTableNameId}` };
    } catch (error) {
        await transaction.rollback();
        console.error('Error during time table structure soft delete:', error);
        throw error;
    }
}
