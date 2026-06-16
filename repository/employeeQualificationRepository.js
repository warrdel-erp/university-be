import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeQualification(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeQualificationModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee qualification:", error);
        throw error;
    }
};

export async function deleteEmployeeQualification(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeQualificationModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee qualification deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeQualifications(employeeId, qualifications, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeQualificationModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = qualifications.map((q) => ({
            employeeId,
            createdBy,
            updatedBy,
            document: q?.document ?? null,
            receivedDate: q?.receivedDate ?? null,
            returnedDate: q?.returnedDate ?? null,
            attachment: q?.attachment ?? null,
        }));

        return await model.employeeQualificationModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee qualifications:", error);
        throw error;
    }
}

export async function getEmployeeQualificationsByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeQualificationModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee qualifications:", error);
        throw error;
    }
}
