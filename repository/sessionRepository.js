import * as model from '../models/index.js'
import { Op } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';
import { scoped, buildScope } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

export async function addSession(sessionData, transaction) {
    try {
        return await scoped(model.sessionModel).create(sessionData, { transaction });
    } catch (error) {
        console.error("Error in add Session :", error);
        throw error;
    }
}

export async function addBulkSession(sessionData, options = {}) {
    try {
        return await model.sessionModel.bulkCreate(sessionData, options);
    } catch (error) {
        console.error("Error in add Session bulk:", error);
        throw error;
    }
}

export async function isSessionAlreadyMapped(sessionId, courseId, instituteId, universityId) {
    try {
        const where = { sessionId, courseId };
        if (instituteId != null) {
            where.instituteId = instituteId;
        }
        if (universityId != null) {
            where.universityId = universityId;
        }

        const existingMapping = await scoped(model.sessionCouseMappingModel).findOne({
            where,
        });
        return !!existingMapping;
    } catch (error) {
        console.error('Error checking if session is already mapped:', error);
        throw error;
    }
}

export async function courseSectionMapping(sessionData, transaction) {
    try {
        return await scoped(model.sessionCouseMappingModel).bulkCreate(sessionData, { transaction });
    } catch (error) {
        console.error("Error in course Session :", error);
        throw error;
    }
}

export async function updateCouseSessionMapping(sessionCourseMappingId, data) {
    try {
        return await scoped(model.sessionCouseMappingModel).update(data, {
            where: { sessionCourseMappingId }
        });
    } catch (error) {
        console.error(`Error updating course session mapping for ${sessionCourseMappingId}:`, error);
        throw error;
    }
}

export async function getSessionDetails() {
    try {
        const mappingScope = buildScope(model.sessionCouseMappingModel);

        return await scoped(model.sessionModel).findAll({
            attributes: { exclude: excludeMeta },
            include: [
                {
                    model: model.acedmicYearModel,
                    as: 'sessionAcedmic',
                    attributes: { exclude: excludeMeta },
                },
                {
                    model: model.sessionCouseMappingModel,
                    as: "courseMappings",
                    where: mappingScope,
                    required: false,
                    attributes: { exclude: excludeMeta },
                    include: [
                        {
                            model: model.courseModel,
                            as: 'courses',
                            attributes: ["courseName", "courseCode"],
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}

export async function getSingleSessionDetails(sessionId) {
    try {
        return await scoped(model.sessionModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { sessionId },
            include: [
                {
                    model: model.acedmicYearModel,
                    as: 'sessionAcedmic',
                    attributes: { exclude: excludeMeta },
                }
            ]
        });
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}

export async function getSessionDetailsByAcedmic(acedmicYearId) {
    try {
        return await model.sessionModel.findAll({
            attributes: { exclude: excludeMeta },
            where: { acedmicYearId },
        });
    } catch (error) {
        console.error('Error fetching Session details By Acedmic Id:', error);
        throw error;
    }
}

export async function getSessionByInstituteAndAcademicYear() {
    try {
        return await scoped(model.sessionModel).findAll({
            attributes: { exclude: excludeMeta },
        });
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}

export async function updateSession(sessionId, sessionData, transaction) {
    try {
        return await scoped(model.sessionModel).update(sessionData, {
            where: { sessionId },
            transaction,
        });
    } catch (error) {
        console.error(`Error updating Session creation ${sessionId}:`, error);
        throw error;
    }
}

export async function isSessionMappedwithcourse(sessionId) {
    try {
        return await scoped(model.sessionCouseMappingModel).findAll({
            where: { sessionId },
            attributes: ["sessionCourseMappingId"]
        });
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}

export async function deleteSession(sessionId) {
    const deleted = await scoped(model.sessionModel).destroy({ where: { sessionId } });
    return deleted > 0;
}

export async function getMappingByCourseAndSession(courseId, sessionId) {
    return scoped(model.sessionCouseMappingModel).findOne({
        where: { courseId, sessionId },
    });
}

export async function assertCourseInScope(courseId) {
    return scoped(model.courseModel).findOne({
        where: { courseId },
        attributes: ['courseId', 'instituteId'],
    });
}

export async function assertSessionInScope(sessionId) {
    return scoped(model.sessionModel).findOne({
        where: { sessionId },
        attributes: ['sessionId', 'universityId', 'instituteId', 'acedmicYearId'],
    });
}

export async function getMappingById(sessionCourseMappingId) {
    return await scoped(model.sessionCouseMappingModel).findOne({
        where: { sessionCourseMappingId }
    });
}

const courseSessionMappingBlockers = (courseId, sessionId, sessionCourseMappingId) => [
    {
        label: "class sections",
        count: () => model.classSectionModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "classes",
        count: () => model.classModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "syllabus",
        count: () => model.syllabusModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "syllabus units",
        count: () => model.syllabusUnitModel.count({
            where: { sessionId },
            include: [{
                model: model.subjectModel,
                as: "subjectUnit",
                where: { courseId },
                required: true,
            }],
        }),
    },
    {
        label: "students",
        count: () => model.studentModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "fee plans",
        count: () => model.feePlanModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "fee plan profiles",
        count: () => model.feePlanProfileModel.count({
            where: { courseSessionId: sessionCourseMappingId },
        }),
    },
    {
        label: "credits",
        count: () => model.creditModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "grade courses",
        count: () => model.gradeCourseModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "exam structures",
        count: () => model.examStructureModel.count({ where: { courseId, sessionId } }),
    },
    {
        label: "lessons",
        count: () => model.lessonModel.count({
            where: { sessionId },
            include: [{
                model: model.subjectModel,
                as: "lessonSubject",
                where: { courseId },
                required: true,
            }],
        }),
    },
    {
        label: "exam schedules",
        count: () => model.examScheduleModel.count({
            where: { sessionId },
            include: [{
                model: model.subjectModel,
                as: "subjectSchedule",
                where: { courseId },
                required: true,
            }],
        }),
    },
    {
        label: "subject weightages",
        count: () => model.subjectWeightageModel.count({
            where: { sessionId },
            include: [{
                model: model.subjectModel,
                as: "subject",
                where: { courseId },
                required: true,
            }],
        }),
    },
];

export async function getCourseSessionMappingBlocker({ courseId, sessionId, sessionCourseMappingId }) {
    const blockers = courseSessionMappingBlockers(courseId, sessionId, sessionCourseMappingId);
    const results = await Promise.all(
        blockers.map(async ({ label, count }) => ({ label, total: await count() }))
    );

    const blocker = results.find(({ total }) => total > 0);
    if (!blocker) {
        return null;
    }

    return `Cannot remove mapping: ${blocker.label} are already created for this course and session.`;
}

export async function deleteCourseSessionMapping(sessionCourseMappingId) {
    const deleted = await scoped(model.sessionCouseMappingModel).destroy({
        where: { sessionCourseMappingId }
    });
    return deleted > 0;
}

function normalizeCourseIds(courseId) {
    if (courseId == null || courseId === '') {
        return [];
    }
    const ids = Array.isArray(courseId) ? courseId : [courseId];
    return [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

function pickSessionUpdateFields(sessionData, updatedBy) {
    const { courseId: _courseId, sessionId: _sessionId, ...sessionFields } = sessionData;
    return { ...sessionFields, updatedBy };
}

async function findCoursesInScope(courseIds, transaction) {
    if (!courseIds.length) {
        return [];
    }

    return scoped(model.courseModel).findAll({
        where: { courseId: { [Op.in]: courseIds } },
        attributes: ['courseId'],
        transaction,
    });
}

async function findMappedCourseIds(sessionId, courseIds, transaction) {
    if (!courseIds.length) {
        return [];
    }

    const rows = await scoped(model.sessionCouseMappingModel).findAll({
        where: {
            sessionId,
            courseId: { [Op.in]: courseIds },
        },
        attributes: ['courseId'],
        transaction,
    });

    return rows.map((row) => row.courseId);
}

export async function syncCourseSessionMappings({
    sessionId,
    courseIds,
    userId,
    transaction,
    rejectExisting = false,
}) {
    const normalizedCourseIds = normalizeCourseIds(courseIds);
    if (!normalizedCourseIds.length) {
        if (rejectExisting) {
            throw new Error('courseId must be a non-empty array');
        }
        return { inserted: 0 };
    }

    const coursesInScope = await findCoursesInScope(normalizedCourseIds, transaction);
    const scopedCourseIds = new Set(coursesInScope.map((course) => course.courseId));
    const missingCourseId = normalizedCourseIds.find((courseId) => !scopedCourseIds.has(courseId));
    if (missingCourseId) {
        throw new Error(`Course ID ${missingCourseId} not found`);
    }

    const mappedCourseIds = new Set(
        await findMappedCourseIds(sessionId, normalizedCourseIds, transaction),
    );

    if (rejectExisting) {
        const duplicateCourseId = normalizedCourseIds.find((courseId) => mappedCourseIds.has(courseId));
        if (duplicateCourseId) {
            throw new Error(`Course ID ${duplicateCourseId} is already mapped to Session ID ${sessionId}`);
        }
    }

    const courseIdsToInsert = rejectExisting
        ? normalizedCourseIds
        : normalizedCourseIds.filter((courseId) => !mappedCourseIds.has(courseId));

    if (!courseIdsToInsert.length) {
        return { inserted: 0 };
    }

    await scoped(model.sessionCouseMappingModel).bulkCreate(
        courseIdsToInsert.map((courseId) => ({
            sessionId,
            courseId,
            createdBy: userId,
            updatedBy: userId,
        })),
        { transaction },
    );

    return { inserted: courseIdsToInsert.length };
}

export async function createSessionWithCourseMappings(sessionData, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        const courseIds = normalizeCourseIds(sessionData.courseId);
        const payload = {
            ...sessionData,
            createdBy,
            updatedBy,
        };
        delete payload.courseId;

        const session = await addSession(payload, transaction);

        await syncCourseSessionMappings({
            sessionId: session.sessionId,
            courseIds,
            userId: createdBy,
            transaction,
        });

        await transaction.commit();
        return session;
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating session and mapping:', error);
        throw error;
    }
}

export async function updateSessionWithCourseMappings(sessionId, sessionData, updatedBy) {
    const transaction = await sequelize.transaction();

    try {
        const numericSessionId = Number(sessionId);
        if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
            throw new Error('sessionId is required');
        }

        const session = await assertSessionInScope(numericSessionId);
        if (!session) {
            throw new Error(`Session ID ${numericSessionId} not found`);
        }

        await updateSession(
            numericSessionId,
            pickSessionUpdateFields(sessionData, updatedBy),
            transaction,
        );

        await syncCourseSessionMappings({
            sessionId: numericSessionId,
            courseIds: sessionData.courseId,
            userId: updatedBy,
            transaction,
        });

        await transaction.commit();
        return getSingleSessionDetails(numericSessionId);
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating session and course mappings:', error);
        throw error;
    }
}

export async function getSessionYearSuffix(sessionId) {
    if (sessionId == null) return null;

    const session = await scoped(model.sessionModel).findOne({
        where: { sessionId: Number(sessionId) },
        attributes: ['startingDate', 'sessionName'],
    });
    if (!session) return null;

    const { startingDate, sessionName } = session.get({ plain: true });
    if (startingDate) {
        const year = String(startingDate).slice(0, 4);
        if (/^\d{4}$/.test(year)) return year.slice(-2);
    }

    const match = String(sessionName ?? '').match(/\b(20)?(\d{2})\b/);
    return match ? match[2] : null;
}
