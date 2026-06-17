import * as model from '../models/index.js';

export async function addacedmicYear(acedmicYearData) {
    try {
        return await model.acedmicYearModel.create(acedmicYearData);
    } catch (error) {
        console.error('Error in add acedmicYear :', error);
        throw error;
    }
}

export async function getacedmicYearDetails(universityId) {
    try {
        const where = universityId != null ? { universityId } : {};
        return await model.acedmicYearModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where,
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function getSingleacedmicYearDetails(acedmicYearId) {
    try {
        return await model.acedmicYearModel.findOne({
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
        return await model.acedmicYearModel.findOne({
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
        const existing = await model.acedmicYearModel.findOne({
            where: { acedmicYearId },
            attributes: ['acedmicYearId'],
        });
        if (!existing) {
            return [0];
        }

        return await model.acedmicYearModel.update(acedmicYearData, {
            where: { acedmicYearId },
        });
    } catch (error) {
        console.error(`Error updating acedmicYear creation ${acedmicYearId}:`, error);
        throw error;
    }
}

export async function deleteacedmicYear(acedmicYearId) {
    const existing = await model.acedmicYearModel.findOne({
        where: { acedmicYearId },
        attributes: ['acedmicYearId'],
    });
    if (!existing) {
        return false;
    }

    const deleted = await model.acedmicYearModel.destroy({
        where: { acedmicYearId },
    });
    return deleted > 0;
}

export async function getAllActiveAcedmicYear() {
    try {
        return await model.acedmicYearModel.findAll({
            where: { isActive: true },
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}
