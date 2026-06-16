import * as model from '../models/index.js'
import { Op } from 'sequelize';
import { buildScope, scoped } from '../utility/scoped.js';

export async function getScheduleInScope(scheduleId) {
    return await scoped(model.scheduleModel).findOne({
        where: { scheduleId },
        attributes: ['scheduleId'],
    });
}

export async function addSchedule(scheduleData) {
    try {
        return await scoped(model.scheduleModel).create(scheduleData);
    } catch (error) {
        console.error('Error in add Schedule :', error);
        throw error;
    }
}

export async function getScheduleDetails() {
    try {
        return await scoped(model.scheduleModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        });
    } catch (error) {
        console.error('Error fetching Schedule with details:', error);
        throw error;
    }
}

export async function getSingleScheduleDetails(scheduleId) {
    try {
        return await scoped(model.scheduleModel).findOne({
            where: { scheduleId },
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        });
    } catch (error) {
        console.error('Error fetching Schedule details:', error);
        throw error;
    }
}

export async function deleteSchedule(scheduleId) {
    const deleted = await scoped(model.scheduleModel).destroy({
        where: { scheduleId },
    });
    return deleted > 0;
}

export async function updateSchedule(scheduleId, scheduleData) {
    try {
        return await scoped(model.scheduleModel).update(scheduleData, {
            where: { scheduleId },
        });
    } catch (error) {
        console.error(`Error updating Schedule ${scheduleId}:`, error);
        throw error;
    }
}

export async function assignTeacher(data) {
    try {
        return await model.scheduleAssignModel.create(data);
    } catch (error) {
        console.error('Error in add assign Teacher :', error);
        throw error;
    }
}

export async function getAssignmentByScheduleAndEmployee(scheduleId, employeeId) {
    try {
        return await model.scheduleAssignModel.findOne({
            where: { scheduleId, employeeId },
        });
    } catch (error) {
        console.error('Error fetching assignment by scheduleId and employeeId:', error);
        throw error;
    }
}

export async function getAssignTeacher() {
    try {
        const scheduleWhere = buildScope(model.scheduleModel);
        const employeeWhere = buildScope(model.employeeModel);

        return await model.scheduleAssignModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            include: [
                {
                    model: model.scheduleModel.unscoped(),
                    as: 'schedule',
                    required: true,
                    where: scheduleWhere,
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                },
                {
                    model: model.employeeModel.unscoped(),
                    as: 'employeeSchedule',
                    required: false,
                    where: employeeWhere,
                    attributes: [
                        'employeeId',
                        'employeeName',
                        'employeeCode',
                        'department',
                        'employmentType',
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching assigned teachers:', error);
        throw error;
    }
}

export async function attendence(data) {
    try {
        return await model.teacherAttendeceModel.create(data);
    } catch (error) {
        console.error('Error in add teacher attendence:', error);
        throw error;
    }
}

export async function updateAttendence(teacherAttendenceId, data) {
    try {
        return await model.teacherAttendeceModel.update(data, {
            where: { teacherAttendenceId },
        });
    } catch (error) {
        console.error(`Error updating teacher attendence ${teacherAttendenceId}:`, error);
        throw error;
    }
}

export async function getAllAttendence(page, limit, fromDate, toDate) {
    try {
        const whereClause = {};
        const scheduleWhere = buildScope(model.scheduleModel);

        if (fromDate && toDate) {
            whereClause.date = { [Op.between]: [fromDate, toDate] };
        } else if (fromDate) {
            whereClause.date = { [Op.gte]: fromDate };
        } else if (toDate) {
            whereClause.date = { [Op.lte]: toDate };
        }

        const pageNumber = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 10;
        const offset = (pageNumber - 1) * pageSize;

        const attendances = await model.teacherAttendeceModel.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            include: [
                {
                    model: model.scheduleAssignModel,
                    as: 'scheduleAssign',
                    required: true,
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                    include: [
                        {
                            model: model.scheduleModel.unscoped(),
                            as: 'schedule',
                            required: true,
                            where: scheduleWhere,
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                        },
                        {
                            model: model.employeeModel.unscoped(),
                            as: 'employeeSchedule',
                            attributes: [
                                'employeeId',
                                'employeeName',
                                'employeeCode',
                                'department',
                                'employmentType',
                            ],
                        },
                    ],
                },
            ],
            limit: pageSize,
            offset,
            order: [['date', 'DESC']],
        });

        return {
            totalRecords: attendances.count,
            totalPages: Math.ceil(attendances.count / pageSize),
            currentPage: pageNumber,
            data: attendances.rows,
        };
    } catch (error) {
        console.error('Error fetching attendance with details:', error);
        throw error;
    }
}
