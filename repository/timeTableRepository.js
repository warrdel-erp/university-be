import * as model from '../models/index.js'
import { requestContext } from '../utility/requestContext.js';
import { buildScope, scoped } from '../utility/scoped.js';

const excludeMeta = ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"];

const structureInclude = (extra = {}) => ({
    model: model.timeTableStructureModel,
    as: 'timeTableName',
    required: true,
    attributes: ['name', 'courseId', 'instituteId', 'acedmicYearId'],
    where: buildScope(model.timeTableStructureModel),
    include: [
        {
            model: model.courseModel.unscoped(),
            as: 'timeTableStructureCourse',
            attributes: ['courseId', 'courseName'],
        },
    ],
    ...extra,
});

async function findPeriodInScope(timeTableCreationId) {
    const scopeWhere = buildScope(model.timeTableStructureModel);
    if (!scopeWhere.instituteId || !scopeWhere.acedmicYearId) {
        return null;
    }

    return await model.timeTableStructurePeriodsModel.findOne({
        where: { timeTableCreationId },
        include: [structureInclude()],
    });
}

export async function getCourseInScope(courseId) {
    const store = requestContext.getStore();
    if (!store?.universityId || !store?.instituteId || !courseId) {
        return null;
    }

    return await model.courseModel.unscoped().findOne({
        where: {
            courseId,
            universityId: store.universityId,
            instituteId: store.instituteId,
        },
        attributes: ['courseId'],
    });
}

export async function addTimeTableName(data, transaction) {
    try {
        const course = await getCourseInScope(data.courseId);
        if (!course) {
            throw new Error('Course not found for this university and institute');
        }

        return await scoped(model.timeTableStructureModel).create(data, { transaction });
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

export async function getTimeTableStructures(courseId, acedmicYearId, role, sessionId) {
    try {
        const scopeWhere = buildScope(model.timeTableStructureModel);
        const where = {
            ...(courseId && { courseId }),
            ...(sessionId && { sessionId }),
        };

        if (courseId) {
            if (acedmicYearId) where.acedmicYearId = acedmicYearId;
        } else {
            if (acedmicYearId) where.acedmicYearId = acedmicYearId;
            if (role === 'Head' && scopeWhere.instituteId) {
                where.instituteId = scopeWhere.instituteId;
            }
        }

        return await scoped(model.timeTableStructureModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where,
            include: [
                {
                    model: model.sessionModel.unscoped(),
                    as: "timeTableSession",
                    attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate", "acedmicYearId", "instituteId"],
                    required: false,
                },
                {
                    model: model.timeTableStructurePeriodsModel,
                    as: "timeTableName",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.courseModel.unscoped(),
                    as: "timeTableStructureCourse",
                    attributes: ["courseId", "courseName", "courseCode"],
                    required: false,
                },
            ],
        });
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

        return await model.timeTableStructurePeriodsModel.update(info, {
            where: { timeTableCreationId },
        });
    } catch (error) {
        console.error(`Error updating time table ${timeTableCreationId}:`, error);
        throw error;
    }
}

export async function deleteTimeTable(timeTableCreationId) {
    try {
        const period = await findPeriodInScope(timeTableCreationId);
        if (!period) {
            return null;
        }

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
