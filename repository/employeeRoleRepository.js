import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeRole(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.emplopeeRoleModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee role:", error);
        throw error;
    }
};

export async function deleteEmployeeRole(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.emplopeeRoleModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee role deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};
