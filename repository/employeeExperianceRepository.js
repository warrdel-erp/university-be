import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeExperiance(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeExperianceModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee experiance:", error);
        throw error;
    }
};

export async function deleteEmployeeExperiance(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeExperianceModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee experiance deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeExperiences(employeeId, experiences, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeExperianceModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = experiences.map((exp) => ({
            employeeId,
            createdBy,
            updatedBy,
            experienceType: exp?.experienceType ?? exp?.experience_type ?? null,
            organization: exp?.organization ?? null,
            desigation: exp?.desigation ?? null,
            fromDate: exp?.fromDate ?? null,
            toDate: exp?.toDate ?? null,
            totalExperianceYears: exp?.totalExperianceYears ?? null,
            totalExperianceMonths: exp?.totalExperianceMonths ?? null,
            totalExperiancedays: exp?.totalExperiancedays ?? null,
            lastSalary: exp?.lastSalary ?? null,
            remarks: exp?.remarks ?? null,
        }));

        return await model.employeeExperianceModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee experiences:", error);
        throw error;
    }
}

export async function getEmployeeExperiencesByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeExperianceModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee experiences:", error);
        throw error;
    }
}
