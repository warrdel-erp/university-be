import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSession(sessionData, transaction) {
    try {
        const result = await model.sessionModel.create(sessionData, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Session :", error);
        throw error;
    }
};

export async function addBulkSession(sessionData) {
    try {
        const result = await model.sessionModel.bulkCreate(sessionData);

        return result;
    } catch (error) {
        console.error("Error in add Session bulk:", error);
        throw error;
    }
};

export async function isSessionAlreadyMapped(sessionId, courseId, instituteId, universityId) {
  try {
    const existingMapping = await model.sessionCouseMappingModel.findOne({
      where: {
        sessionId,
        courseId,
        instituteId,
        universityId
      }
    });
    return !!existingMapping;
  } catch (error) {
    console.error('Error checking if session is already mapped:', error);
    throw error;
  }
}

export async function courseSectionMapping(sessionData, transaction) {
    try {
        const result = await model.sessionCouseMappingModel.bulkCreate(sessionData, { transaction });
        return result;
    } catch (error) {
        console.error("Error in course Session :", error);
        throw error;
    }
};

export async function updateCouseSessionMapping(sessionCourseMappingId, data) {
    try {
        const result = await model.sessionCouseMappingModel.update(data, {
            where: { sessionCourseMappingId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating course session mapping for ${sessionCourseMappingId}:`, error);
        throw error;
    }
};

export async function getSessionDetails(universityId, instituteId, role, acedmicYearId) {
    try {
        const session = await model.sessionModel.findAll({
            where: {
                instituteId,
                ...(acedmicYearId && { acedmicYearId }),
                ...(universityId && { universityId }),
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            include: [
                {
                    model: model.acedmicYearModel,
                    as: 'sessionAcedmic',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                },
                {
                    model: model.sessionCouseMappingModel,
                    as: "courseMappings",
                    where: { instituteId },
                    required: false,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
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

        return session;
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}

export async function getSingleSessionDetails(sessionId) {
    try {
        const Session = await model.sessionModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { sessionId },
            include: [
                {
                    model: model.acedmicYearModel,
                    as: 'sessionAcedmic',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                }
            ]
        });

        return Session;
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}

export async function getSessionDetailsByAcedmic(acedmicYearId) {
    try {
        const Session = await model.sessionModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { acedmicYearId },
        });

        return Session;
    } catch (error) {
        console.error('Error fetching Session details By Acedmic Id:', error);
        throw error;
    }
}

export async function getSessionByInstituteAndAcademicYear(instituteId, acedmicYearId) {
    try {
        const session = await model.sessionModel.findAll({
            where: {
                instituteId, acedmicYearId
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        });

        return session;
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}


export async function updateSession(sessionId, sessionData) {
    try {
        const result = await model.sessionModel.update(sessionData, {
            where: { sessionId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating Session creation ${sessionId}:`, error);
        throw error;
    }
}

export async function isSessionMappedwithcourse(sessionId, instituteId, universityId) {
    try {
        const session = await model.sessionCouseMappingModel.findAll({
            where: {
                sessionId,
                instituteId,
                universityId
            },
            attributes: ["sessionCourseMappingId"]
        });
        return session;
    } catch (error) {
        console.error('Error fetching Session details:', error);
        throw error;
    }
}

export async function deleteSession(sessionId) {
    const deleted = await model.sessionModel.destroy({ where: { session_id: sessionId } });
    return deleted > 0;
};

export async function getMappingByCourseAndSession(courseId, sessionId) {
    return await model.sessionCouseMappingModel.findOne({
        where: { courseId, sessionId }
    });
}

export async function getMappingById(sessionCourseMappingId) {
    return await model.sessionCouseMappingModel.findOne({
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
    const deleted = await model.sessionCouseMappingModel.destroy({
        where: { sessionCourseMappingId }
    });
    return deleted > 0;
}