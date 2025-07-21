import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addHoliday(holidayData) {    
    try {
        const result = await model.holidayModel.create(holidayData);
        return result;
    } catch (error) {
        console.error("Error in add Holiday :", error);
        throw error;
    }
};

export async function getHolidayDetails(universityId) {
    try {
        const Holiday = await model.holidayModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
        });

        return Holiday;
    } catch (error) {
        console.error('Error fetching Holiday details:', error);
        throw error;
    }
}


export async function getSingleHolidayDetails(holidayId) {
    try {
        const Holiday = await model.holidayModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { holidayId },
        });

        return Holiday;
    } catch (error) {
        console.error('Error fetching Holiday details:', error);
        throw error;
    }
};

export async function getHolidayStartEndDate(startDate, endingDate) {
    try {
        const holidays = await model.holidayModel.findAll({
            where: {
                date: {
                    [Op.between]: [startDate, endingDate]
                }
            },
            attributes: ["holidayId", "date", "name", "event", "remark"]
        });

        return holidays;
    } catch (error) {
        console.error('Error fetching Holiday details:', error);
        throw error;
    }
};

export async function deleteHoliday(holidayId) {
    const deleted = await model.holidayModel.destroy({ where: { holidayId: holidayId } });
    return deleted > 0;
}

export async function updateHoliday(holidayId, holidayData) {
    try {
        const result = await model.holidayModel.update(holidayData, {
            where: { holidayId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Holiday creation ${holidayId}:`, error);
        throw error; 
    }
}