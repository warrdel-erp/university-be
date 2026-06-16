import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function addacedmicYear(acedmicYearData) {
    try {
        return await scoped(model.acedmicYearModel).create(acedmicYearData);
    } catch (error) {
        console.error('Error in add acedmicYear :', error);
        throw error;
    }
}

export async function getacedmicYearDetails(universityId, instituteId) {
    try {
        return await scoped(model.acedmicYearModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where: { universityId, instituteId },
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function getSingleacedmicYearDetails(acedmicYearId) {
    try {
        return await scoped(model.acedmicYearModel).findOne({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where: { acedmicYearId },
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function getSingleacedmicYearDetailsByTitle(yearTitle) {
    try {
        return await scoped(model.acedmicYearModel).findOne({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where: { yearTitle },
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function updateacedmicYear(acedmicYearId, acedmicYearData) {
    try {
        const existing = await scoped(model.acedmicYearModel).findOne({
            where: { acedmicYearId },
            attributes: ['acedmicYearId'],
        });
        if (!existing) {
            return [0];
        }

        return await scoped(model.acedmicYearModel).update(acedmicYearData, {
            where: { acedmicYearId },
        });
    } catch (error) {
        console.error(`Error updating acedmicYear creation ${acedmicYearId}:`, error);
        throw error;
    }
}

export async function deleteacedmicYear(acedmicYearId) {
    const existing = await scoped(model.acedmicYearModel).findOne({
        where: { acedmicYearId },
        attributes: ['acedmicYearId'],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.acedmicYearModel).destroy({
        where: { acedmicYearId },
    });
    return deleted > 0;
}

export async function getAllActiveAcedmicYear(universityId, instituteId) {
    try {
        return await scoped(model.acedmicYearModel).findAll({
            where: { isActive: true, universityId, instituteId },
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}
