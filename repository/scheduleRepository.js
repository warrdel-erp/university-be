import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addSchedule(scheduleData) {   
    console.log(`>>>>>scheduleData`,scheduleData)
    try {
        const result = await model.scheduleModel.create(scheduleData);
        return result;
    } catch (error) {
        console.error("Error in add Schedule :", error);
        throw error;
    }
};

export async function addScheduleDetails(scheduleData) {   
    try {
        const result = await model.scheduleModel.bulkCreate(scheduleData);
        return result;
    } catch (error) {
        console.error("Error in add Schedule details:", error);
        throw error;
    }
};

export async function getScheduleDetails(universityId,acedmicYearId,instituteId,role) {
    try {
        const Schedule = await model.scheduleModel.findAll({
            where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(role === 'Head' && { instituteId }),
                        ...(universityId && { universityId }),
                    },
            attributes: { 
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
            },
        });
        return Schedule;
    } catch (error) {
        console.error('Error fetching Schedule with details:', error);
        throw error;
    }
};


export async function getSingleScheduleDetails(scheduleId,universityId) {
    try {
        const Schedule = await model.scheduleModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { scheduleId,universityId},
        });

        return Schedule;
    } catch (error) {
        console.error('Error fetching Schedule details:', error);
        throw error;
    }
}

export async function deleteSchedule(scheduleId) {
    const deleted = await model.scheduleModel.destroy({ where: { scheduleId: scheduleId } });
    return deleted > 0;
}

export async function updateSchedule(scheduleId, scheduleData) {
    try {
        const result = await model.scheduleModel.update(scheduleData, {
            where: { scheduleId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Schedule creation ${scheduleId}:`, error);
        throw error; 
    }
};
