import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeReference(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeReferenceModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee reference:", error);
        throw error;
    }
};

export async function deleteEmployeeReference(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeReferenceModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee reference deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeReferences(employeeId, references, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeReferenceModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = references.map(r => ({
            employeeId,
            createdBy,
            updatedBy,
            name: r.name,
            designation: r.designation,
            mobileNumber: r.mobileNumber ?? r.mobaileNumber ?? null,
            address: r.address ?? null,
        }));

        return await model.employeeReferenceModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee references:", error);
        throw error;
    }
};

export async function getEmployeeReferencesByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeReferenceModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee references:", error);
        throw error;
    }
};
