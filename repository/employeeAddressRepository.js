import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addAddress(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeAddressModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee address:", error);
        throw error;
    }
};

export async function addCorsAddress(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeCorAddressModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in adding cors address:", error);
        throw error;
    }
};

export async function updateAddress(employeeId, data, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            return [0];
        }
        return await model.employeeAddressModel.update(
            data,
            { where: { employeeId }, transaction },
        );
    } catch (error) {
        console.error("Error updating employee address:", error);
        throw error;
    }
}

export async function updateCorsAddress(employeeId, data, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            return [0];
        }
        return await model.employeeCorAddressModel.update(
            data,
            { where: { employeeId }, transaction },
        );
    } catch (error) {
        console.error("Error updating employee correspondence address:", error);
        throw error;
    }
}

export async function deleteEmployeeAddress(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeAddressModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee address deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};
