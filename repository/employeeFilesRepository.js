import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeFiles(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeFilesModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee Files:", error);
        throw error;
    }
};

export async function updateEmployee(employeeId, data, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            return [0];
        }
        return await scoped(model.employeeModel).update(data, {
            where: { employeeId },
            transaction,
        });
    } catch (error) {
        console.error("Error in updateEmployee:", error);
        throw error;
    }
}
