import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

const staffInclude = [
    {
        model: model.departmentModel,
        as: 'staffDepartment',
        attributes: { exclude: excludeMeta },
    },
    {
        model: model.employeeModel,
        as: 'staffEmployee',
        attributes: ['employeeId', 'employeeName', 'employeeCode', 'pickColor', 'userId'],
        include: [
            {
                model: model.userModel,
                as: 'user',
                attributes: ['userId', 'userName', 'email', 'phone', 'status'],
            },
        ],
    },
];

async function resolveEmployeeId({ userId, employeeId }) {
    if (employeeId != null) {
        return Number(employeeId);
    }

    if (userId != null) {
        const employee = await scoped(model.employeeModel).findOne({
            attributes: ['employeeId'],
            where: { userId: Number(userId) },
        });
        if (!employee) {
            throw new Error('Employee not found for userId');
        }
        return employee.employeeId;
    }

    throw new Error('userId or employeeId is required');
}

export async function addStaff(staffData) {
    try {
        const employeeId = await resolveEmployeeId(staffData);
        const payload = {
            departmentId: staffData.departmentId,
            employeeId,
            createdBy: staffData.createdBy,
            updatedBy: staffData.updatedBy,
        };
        return await scoped(model.staffModel).create(payload);
    } catch (error) {
        console.error('Error in add Staff :', error);
        throw error;
    }
}

export async function getStaffDetails() {
    try {
        return await scoped(model.staffModel).findAll({
            attributes: { exclude: excludeMeta },
            include: staffInclude,
        });
    } catch (error) {
        console.error('Error fetching Staff details:', error);
        throw error;
    }
}

export async function getSingleStaffDetails(staffId) {
    try {
        return await scoped(model.staffModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { staffId },
            include: staffInclude,
        });
    } catch (error) {
        console.error('Error fetching Staff details:', error);
        throw error;
    }
}

export async function deleteStaff(staffId) {
    const deleted = await scoped(model.staffModel).destroy({ where: { staffId } });
    return deleted > 0;
}

export async function updateStaff(staffId, staffData) {
    try {
        const payload = {
            updatedBy: staffData.updatedBy,
        };

        if (staffData.departmentId != null) {
            payload.departmentId = staffData.departmentId;
        }

        if (staffData.userId != null || staffData.employeeId != null) {
            payload.employeeId = await resolveEmployeeId(staffData);
        }

        return await scoped(model.staffModel).update(payload, {
            where: { staffId },
        });
    } catch (error) {
        console.error(`Error updating Staff creation ${staffId}:`, error);
        throw error;
    }
}
