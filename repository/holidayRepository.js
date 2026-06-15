import * as model from '../models/index.js'
import { Op } from 'sequelize';
import { scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

export async function addHoliday(holidayData) {
    try {
        const store = requestContext.getStore();

        if (!store?.instituteId || !store?.academicYearId) {
            throw new Error('Institute and academic year are required to create a holiday');
        }

        holidayData.instituteId = store.instituteId;
        holidayData.acedmicYearId = store.academicYearId;

        const result = await model.holidayModel.create(holidayData);
        return result;
    } catch (error) {
        console.error('Error in add Holiday :', error);
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
            where: { holidayId },
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
    const deleted = await model.holidayModel.destroy({ where: { holidayId } });
    return deleted > 0;
}

export async function updateHoliday(holidayId, holidayData) {
    try {
        const result = await model.holidayModel.update(holidayData, {
            where: { holidayId },
        });
        return result;
    } catch (error) {
        console.error(`Error updating Holiday creation ${holidayId}:`, error);
        throw error;
    }
}
