import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { scoped } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

const stripTenantFields = (data = {}) => {
    const { holidayId, instituteId, academicYearId, universityId, ...rest } = data;
    return rest;
};

export async function addHoliday(holidayData) {
    try {
        return await scoped(model.holidayModel).create(stripTenantFields(holidayData));
    } catch (error) {
        console.error('Error in add Holiday :', error);
        throw error;
    }
}

export async function getAllHolidays(filter = {}) {
    try {
        return await scoped(model.holidayModel).findAll({
            where: { ...filter },
            attributes: { exclude: excludeMeta },
            order: [['date', 'DESC']],
        });
    } catch (error) {
        console.error('Error fetching Holiday details:', error);
        throw error;
    }
}

export async function getHolidayDetails(page, limit, filter = {}) {
    try {
        const pageNumber = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 10;
        const offset = (pageNumber - 1) * pageSize;

        const { rows: holidays, count: total } = await scoped(model.holidayModel).findAndCountAll({
            where: { ...filter },
            attributes: { exclude: excludeMeta },
            limit: pageSize,
            offset,
            order: [['date', 'DESC']],
        });

        return { holidays, total, page: pageNumber, limit: pageSize };
    } catch (error) {
        console.error('Error fetching Holiday details:', error);
        throw error;
    }
}

export async function getSingleHolidayDetails(holidayId) {
    try {
        return await scoped(model.holidayModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { holidayId: Number(holidayId) },
        });
    } catch (error) {
        console.error('Error fetching Holiday details:', error);
        throw error;
    }
}

export async function getHolidayStartEndDate(startDate, endingDate) {
    try {
        return await scoped(model.holidayModel).findAll({
            where: {
                date: {
                    [Op.between]: [startDate, endingDate],
                },
            },
            attributes: ['holidayId', 'date', 'name', 'event', 'remark'],
        });
    } catch (error) {
        console.error('Error fetching Holiday details:', error);
        throw error;
    }
}

export async function deleteHoliday(holidayId) {
    const deleted = await scoped(model.holidayModel).destroy({
        where: { holidayId: Number(holidayId) },
    });
    return deleted > 0;
}

export async function updateHoliday(holidayId, holidayData) {
    try {
        const result = await scoped(model.holidayModel).update(stripTenantFields(holidayData), {
            where: { holidayId: Number(holidayId) },
        });
        return result;
    } catch (error) {
        console.error(`Error updating Holiday creation ${holidayId}:`, error);
        throw error;
    }
}
