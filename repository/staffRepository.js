import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

const staffInclude = [
    {
        model: model.departmentModel,
        as: 'staffDepartment',
        attributes: { exclude: excludeMeta },
        required: true,
        where: buildScope(model.departmentModel),
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

async function assertDepartmentExists(departmentId) {
    const department = await scoped(model.departmentModel).findOne({
        attributes: ['departmentId'],
        where: { departmentId: Number(departmentId) },
    });
    if (!department) {
        throw new Error('Department not found');
    }
}

async function resolveEmployeeId({ userId, employeeId }) {
    const resolvedUserId = userId != null ? Number(userId) : null;
    const resolvedEmployeeId = employeeId != null ? Number(employeeId) : null;

    if (resolvedEmployeeId != null) {
        const employee = await scoped(model.employeeModel).findOne({
            attributes: ['employeeId', 'userId'],
            where: { employeeId: resolvedEmployeeId },
        });
        if (!employee) {
            throw new Error('Employee not found');
        }
        if (resolvedUserId != null && employee.userId !== resolvedUserId) {
            throw new Error('userId does not match employeeId');
        }
        return employee.employeeId;
    }

    if (resolvedUserId != null) {
        const employee = await scoped(model.employeeModel).findOne({
            attributes: ['employeeId'],
            where: { userId: resolvedUserId },
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
        await assertDepartmentExists(staffData.departmentId);
        const employeeId = await resolveEmployeeId(staffData);
        const payload = {
            departmentId: Number(staffData.departmentId),
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
            where: { staffId: Number(staffId) },
            include: staffInclude,
        });
    } catch (error) {
        console.error('Error fetching Staff details:', error);
        throw error;
    }
}

export async function deleteStaff(staffId) {
    const deleted = await scoped(model.staffModel).destroy({
        where: { staffId: Number(staffId) },
    });
    return deleted > 0;
}

export async function updateStaff(staffId, staffData) {
    try {
        const existing = await scoped(model.staffModel).findOne({
            attributes: ['staffId'],
            where: { staffId: Number(staffId) },
        });
        if (!existing) {
            return false;
        }

        const payload = {
            updatedBy: staffData.updatedBy,
        };

        if (staffData.departmentId != null) {
            await assertDepartmentExists(staffData.departmentId);
            payload.departmentId = Number(staffData.departmentId);
        }

        if (staffData.userId != null || staffData.employeeId != null) {
            payload.employeeId = await resolveEmployeeId(staffData);
        }

        await scoped(model.staffModel).update(payload, {
            where: { staffId: Number(staffId) },
        });
        return true;
    } catch (error) {
        console.error(`Error updating Staff creation ${staffId}:`, error);
        throw error;
    }
}
