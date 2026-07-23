import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

export async function departmentExists(departmentId) {
    return scoped(model.departmentModel).findOne({
        attributes: ['departmentId'],
        where: { departmentId: Number(departmentId) },
    });
}

export async function addDepartment(departmentData) {
    try {
        return await scoped(model.departmentModel).create(departmentData);
    } catch (error) {
        console.error('Error in add Department :', error);
        throw error;
    }
}

export async function getDepartmentDetails() {
    try {
        return await scoped(model.departmentModel).findAll({
            attributes: { exclude: excludeMeta },
            order: [['departmentId', 'ASC']],
        });
    } catch (error) {
        console.error('Error fetching Department details:', error);
        throw error;
    }
}

export async function getSingleDepartmentDetails(departmentId) {
    try {
        return await scoped(model.departmentModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { departmentId },
        });
    } catch (error) {
        console.error('Error fetching Department details:', error);
        throw error;
    }
}

export async function deleteDepartment(departmentId) {
    const existing = await scoped(model.departmentModel).findOne({
        where: { departmentId },
        attributes: ['departmentId'],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.departmentModel).destroy({ where: { departmentId } });
    return deleted > 0;
}

export async function updateDepartment(departmentId, departmentData) {
    try {
        const existing = await scoped(model.departmentModel).findOne({
            where: { departmentId },
            attributes: ['departmentId'],
        });
        if (!existing) {
            return false;
        }

        await scoped(model.departmentModel).update(departmentData, {
            where: { departmentId },
        });
        return true;
    } catch (error) {
        console.error(`Error updating Department creation ${departmentId}:`, error);
        throw error;
    }
}

export async function employeeDetail(departmentName) {
    try {
        return await scoped(model.employeeModel).findAll({
            where: { department: departmentName },
            attributes: { exclude: excludeMeta },
        });
    } catch (error) {
        console.error('Error fetching employee details:', error);
        throw error;
    }
}
