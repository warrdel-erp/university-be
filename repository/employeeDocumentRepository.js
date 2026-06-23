import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function addEmployeeDocuments(data, transaction) {
    try {
        const employee = await assertScopedEmployee(data.employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return await model.employeeDocumentsModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add employee documents:", error);
        throw error;
    }
};

export async function deleteEmployeeDocuments(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeDocumentsModel.destroy({
            where: { employeeId },
            individualHooks: true,
        });
        return { message: 'employee role deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function refreshEmployeeDocuments(employeeId, documents, createdBy, updatedBy, transaction) {
    try {
        const employee = await assertScopedEmployee(employeeId, transaction);
        if (!employee) {
            throw new Error('Employee not found');
        }

        await model.employeeDocumentsModel.destroy({
            where: { employeeId },
            transaction,
        });

        const insertData = documents.map((doc) => ({
            employeeId,
            createdBy,
            updatedBy,
            qualifications: doc?.qualifications ?? null,
            degreeLevel: doc?.degreeLevel ?? null,
            stream: doc?.stream ?? doc?.degreeLevel ?? null,
            fromYear: doc?.fromYear ?? null,
            toYear: doc?.toYear ?? null,
            university: doc?.university ?? null,
            medicalCouncilName: doc?.medicalCouncilName ?? null,
            medicalRegistrationNumber: doc?.medicalRegistrationNumber ?? null,
            medicalCouncilRegistrationDate: doc?.medicalCouncilRegistrationDate ?? null,
            medicalRegistrationExpiryDate: doc?.medicalRegistrationExpiryDate ?? null,
            percentage: doc?.percentage ?? null,
            remarks: doc?.remarks ?? null,
            pursuing: doc?.pursuing ?? null,
        }));

        return await model.employeeDocumentsModel.bulkCreate(insertData, { transaction });
    } catch (error) {
        console.error("Error refreshing employee documents:", error);
        throw error;
    }
}

export async function getEmployeeDocumentsByEmployeeId(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            return [];
        }
        return await model.employeeDocumentsModel.findAll({
            where: { employeeId },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    } catch (error) {
        console.error("Error fetching employee documents:", error);
        throw error;
    }
}
