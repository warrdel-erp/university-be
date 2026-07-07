import { Op } from 'sequelize';
import * as model from '../models/index.js'
import { getTenantStore } from '../utility/requestContext.js';
import { buildScope, scoped } from '../utility/scoped.js';

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

async function resolveSessionForStructure(data, scopeWhere, transaction) {
    const { sessionId } = data;

    if (!sessionId) {
        return null;
    }

    const session = await scoped(model.sessionModel).findOne({
        where: { sessionId },
        attributes: ['sessionId', 'universityId', 'instituteId', 'academicYearId'],
        transaction,
    });
    if (!session) {
        throw new Error('Session not found');
    }
    if (Number(session.universityId) !== Number(scopeWhere.universityId)) {
        throw new Error('Session does not belong to this university');
    }
    if (Number(session.instituteId) !== Number(scopeWhere.instituteId)) {
        throw new Error('Session does not belong to this institute');
    }
    if (Number(session.academicYearId) !== Number(scopeWhere.academicYearId)) {
        throw new Error('Session does not belong to this academic year');
    }
    return session.sessionId;
}

function resolveCourseIds(data) {
    const ids = [];
    if (Array.isArray(data.courseIds)) {
        for (const id of data.courseIds) {
            ids.push(Number(id));
        }
    }
    if (data.courseId) {
        ids.push(Number(data.courseId));
    }
    return [...new Set(ids)];
}

export async function buildTimeTableStructureCreatePayload(data, transaction) {
    const scopeWhere = buildScope(model.timeTableStructureModel);
    if (!scopeWhere.universityId || !scopeWhere.instituteId || !scopeWhere.academicYearId) {
        throw new Error('universityId, instituteId and academicYearId are required in request context');
    }

    const courseIds = resolveCourseIds(data);
    for (const courseId of courseIds) {
        const course = await getCourseInScope(courseId);
        if (!course) {
            throw new Error('Course not found for this university and institute');
        }
    }

    const sessionId = await resolveSessionForStructure(data, scopeWhere, transaction);

    const payload = {
        name: data.name,
        maximumPeriod: data.maximumPeriod,
        courseId: courseIds[0] ?? null,
        periodLength: data.periodLength,
        periodGap: data.periodGap,
        startingTime: data.startingTime,
        weekOff: data.weekOff,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        sessionId,
        universityId: scopeWhere.universityId,
        instituteId: scopeWhere.instituteId,
        academicYearId: scopeWhere.academicYearId,
    };

    return { payload, courseIds };
}

export async function addTimeTableName(data, transaction) {
    try {
        const { payload, courseIds } = await buildTimeTableStructureCreatePayload(data, transaction);
        const structure = await scoped(model.timeTableStructureModel).create(payload, { transaction });

        if (courseIds.length) {
            const courseRows = [];
            for (const courseId of courseIds) {
                courseRows.push({
                    timeTableNameId: structure.timeTableNameId,
                    courseId,
                    createdBy: data.createdBy,
                    updatedBy: data.updatedBy,
                });
            }
            await scoped(model.timeTableStructureCourseModel).bulkCreate(courseRows, { transaction });
        }

        return structure;
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

export async function getTimeTableStructures({ courseId, sessionId } = {}) {
    try {
        const where = {
            ...(sessionId && { sessionId: Number(sessionId) }),
        };

        if (courseId) {
            const mappings = await scoped(model.timeTableStructureCourseModel).findAll({
                where: { courseId: Number(courseId) },
                attributes: ['timeTableNameId'],
            });
            const nameIds = [...new Set(mappings.map((mapping) => mapping.timeTableNameId))];
            if (!nameIds.length) {
                return [];
            }
            where.timeTableNameId = { [Op.in]: nameIds };
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
                    model: model.timeTableStructureCourseModel,
                    as: "structureCourses",
                    attributes: ["timeTableStructureCourseId", "courseId"],
                    required: false,
                    include: [
                        {
                            model: model.courseModel,
                            as: "course",
                            attributes: ["courseId", "courseName", "courseCode", "termType"],
                        },
                    ],
                },
            ],
        });

        const result = [];
        for (const row of rows) {
            const plain = row.get({ plain: true });
            const courses = [];
            const structureCourses = plain.structureCourses || [];
            for (const mapping of structureCourses) {
                if (mapping.course) {
                    courses.push(mapping.course);
                }
            }
            plain.courses = courses;
            plain.termType = courses.length ? courses[0].termType : null;
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

        const usedInRoutine = await scoped(model.classScheduleModel).findOne({
            where: { timeTableCreationId },
            attributes: ['timeTableMappingId'],
        });
        if (usedInRoutine) {
            throw new Error('Cannot delete: this time table structure is already used in routine creation');
        }

        await model.timeTableStructurePeriodsModel.destroy({
            where: { timeTableCreationId },
            individualHooks: true,
        });

        return { message: `time table creation deleted successfully for time Table Creation Id ${timeTableCreationId}` };
    } catch (error) {
        console.error('Error during soft delete:', error);
        if (error.message.includes('used in routine creation')) {
            throw error;
        }
        throw new Error('Unable to soft delete account');
    }
}
