import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeResearch(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeResearchModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee research:", error);
        throw error;
    }
};

export async function deleteEmployeeResearch(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeResearchModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee research deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeResearch(employeeId, research, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeResearchModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = research.map((r) => ({
            employeeId,
            createdBy,
            updatedBy,
            thesisName: r?.thesisName ?? null,
            associate: r?.associate ?? null,
            periodFrom: r?.periodFrom ?? null,
            to: r?.to ?? null,
            institution: r?.institution ?? null,
        }));

        return await model.employeeResearchModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee research:", error);
        throw error;
    }
};

export async function getEmployeeResearchByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeResearchModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee research:", error);
        throw error;
    }
};
