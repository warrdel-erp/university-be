import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addOfficeDetails(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeOfficeModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee office:", error);
        throw error;
    }
};

export async function updateOfficeDetails(employeeId, data, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            return [0];
        }
        return await model.employeeOfficeModel.update(
            data,
            { where: { employeeId }, transaction },
        );
    } catch (error) {
        console.error("Error updating employee office details:", error);
        throw error;
    }
}

export async function updateOfficeDetailsById(employeeOfficeId, data, transaction) {
    try {
        const office = await model.employeeOfficeModel.findOne({
            where: { employeeOfficeId },
            attributes: ['employeeId'],
            transaction,
        });
        if (!office) {
            return [0];
        }
        const employee = await assertScopedEmployee(office.employeeId, transaction);
        if (!employee) {
            return [0];
        }
        return await model.employeeOfficeModel.update(
            data,
            { where: { employeeOfficeId }, transaction },
        );
    } catch (error) {
        console.error("Error updating employee office details by id:", error);
        throw error;
    }
}

export async function getEmployeeOfficeByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return null;
        }
        return await model.employeeOfficeModel.findOne({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee office details:", error);
        throw error;
    }
}

export async function deleteEmployeeOffice(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeOfficeModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee office details deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};
