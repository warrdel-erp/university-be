import * as model from '../models/index.js'
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

export async function addBulkSession(sessionData) {
    try {
        return await model.sessionModel.bulkCreate(sessionData);
    } catch (error) {
        console.error("Error in add Session bulk:", error);
        throw error;
    }
}

export async function isSessionAlreadyMapped(sessionId, courseId) {
    try {
        const existingMapping = await scoped(model.sessionCouseMappingModel).findOne({
            where: { sessionId, courseId }
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

export async function updateSession(sessionId, sessionData) {
    try {
        return await scoped(model.sessionModel).update(sessionData, {
            where: { sessionId }
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
    return await scoped(model.sessionCouseMappingModel).findOne({
        where: { courseId, sessionId }
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
