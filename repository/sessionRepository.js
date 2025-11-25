import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSession(sessionData,transaction) {    
    try {
        const result = await model.sessionModel.create(sessionData,{transaction});
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

export async function courseSectionMapping(sessionData,transaction) {    
    try {
        const result = await model.sessionCouseMappingModel.bulkCreate(sessionData,{transaction});
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

export async function getSessionDetails(universityId,instituteId,role,acedmicYearId) {
    try {
        const session = await model.sessionModel.findAll({
            where:{
            ...(acedmicYearId && { acedmicYearId }),
             ...(universityId && { universityId }),
            ...(role === 'Head' && { instituteId })
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model:model.acedmicYearModel,
                    as:'sessionAcedmic',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
                {
                    model:model.sessionCouseMappingModel,
                    as:"courseMappings",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include:[
                        {
                            model:model.courseModel,
                            as:'courses',
                            attributes: ["courseName","courseCode"],
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
            include:[
                {
                    model:model.acedmicYearModel,
                    as:'sessionAcedmic',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
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

export async function deleteSession(sessionId) {    
    const deleted = await model.sessionModel.destroy({ where: { session_id: sessionId } });
    return deleted > 0;
};