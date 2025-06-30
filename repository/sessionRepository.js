import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSession(sessionData) {    
    try {
        const result = await model.sessionModel.create(sessionData);
        return result;
    } catch (error) {
        console.error("Error in add Session :", error);
        throw error;
    }
};

export async function courseSectionMapping(sessionData) {    
    try {
        const result = await model.sessionCouseMappingModel.bulkCreate(sessionData);
        return result;
    } catch (error) {
        console.error("Error in add Session :", error);
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
                    model:model.courseModel,
                    as:'course',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
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
    console.log(`>>>>>>>>>>>sessionId`,sessionId);
    
    const deleted = await model.sessionModel.destroy({ where: { session_id: sessionId } });
    return deleted > 0;
};