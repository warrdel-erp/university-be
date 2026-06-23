import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeActivity(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeActivityModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee activity:", error);
        throw error;
    }
};

export async function deleteEmployeeActivity(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeActivityModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee activity deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeActivities(employeeId, activities, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeActivityModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = activities.map((a) => ({
            employeeId,
            createdBy,
            updatedBy,
            activity: a?.activity ?? a?.activityName ?? null,
            monthYear: a?.monthYear ?? a?.date ?? null,
            remarks: a?.remarks ?? a?.description ?? null,
        }));

        return await model.employeeActivityModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee activities:", error);
        throw error;
    }
};

export async function getEmployeeActivitiesByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeActivityModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee activities:", error);
        throw error;
    }
};
