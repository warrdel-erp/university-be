import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeWard(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeWardModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee ward:", error);
        throw error;
    }
};

export async function deleteEmployeeWard(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeWardModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee ward deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeWards(employeeId, wards, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeWardModel.destroy({ where: { employeeId }, transaction });

        const insertData = wards.map((w) => ({
            employeeId,
            createdBy,
            updatedBy,
            name: w?.name ?? null,
            relationship: w?.relationship ?? null,
            dateOfBirth: w?.dateOfBirth ?? null,
            profession: w?.profession ?? null,
        }));

        return await model.employeeWardModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee wards:", error);
        throw error;
    }
};
