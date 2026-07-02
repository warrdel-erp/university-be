import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { scoped } from '../utility/scoped.js';

const listAttributes = { exclude: ['updatedAt', 'deletedAt'] };

export async function addacedmicYear(acedmicYearData, options = {}) {
    try {
        return await scoped(model.acedmicYearModel).create(acedmicYearData, options);
    } catch (error) {
        console.error('Error in add acedmicYear :', error);
        throw error;
    }
}

/** All academic years for the active institute (scoped via universityId + instituteId). */
export async function getacedmicYearDetails() {
    try {
        return await scoped(model.acedmicYearModel).findAll({
            attributes: listAttributes,
            order: [['createdAt', 'DESC']],
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function getSingleacedmicYearDetails(academicYearId, options = {}) {
    try {
        return await scoped(model.acedmicYearModel).findOne({
            attributes: listAttributes,
            where: { academicYearId },
            ...options,
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function getSingleacedmicYearDetailsByTitle(yearTitle) {
    try {
        return await scoped(model.acedmicYearModel).findOne({
            attributes: listAttributes,
            where: { yearTitle },
            order: [['createdAt', 'DESC']],
        });
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

/** Active university only — row with no institute assigned yet. */
export async function findByYearTitleAndUniversityWithoutInstitute(yearTitle, universityId) {
    try {
        return await model.acedmicYearModel.findOne({
            where: {
                yearTitle,
                universityId,
                instituteId: { [Op.is]: null },
            },
            order: [['createdAt', 'DESC']],
        });
    } catch (error) {
        console.error('Error finding acedmicYear without institute:', error);
        throw error;
    }
}

/** Claim a university-level row for the active institute (instituteId must be null on row). */
export async function claimUniversityAcedmicYear(academicYearId, universityId, acedmicYearData, options = {}) {
    try {
        const [updated] = await model.acedmicYearModel.update(acedmicYearData, {
            where: {
                academicYearId,
                universityId,
                instituteId: { [Op.is]: null },
            },
            ...options,
        });
        if (!updated) {
            return null;
        }
        return await scoped(model.acedmicYearModel).findOne({
            where: { academicYearId },
            attributes: listAttributes,
            ...options,
        });
    } catch (error) {
        console.error(`Error claiming acedmicYear ${academicYearId}:`, error);
        throw error;
    }
}

export async function updateacedmicYear(academicYearId, acedmicYearData, options = {}) {
    try {
        const existing = await scoped(model.acedmicYearModel).findOne({
            where: { academicYearId },
            attributes: ['academicYearId'],
            ...options,
        });
        if (!existing) {
            return false;
        }

        await scoped(model.acedmicYearModel).update(acedmicYearData, {
            where: { academicYearId },
            ...options,
        });
        return true;
    } catch (error) {
        console.error(`Error updating acedmicYear creation ${academicYearId}:`, error);
        throw error;
    }
}

export async function deleteacedmicYear(academicYearId) {
    const existing = await scoped(model.acedmicYearModel).findOne({
        where: { academicYearId },
        attributes: ['academicYearId'],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.acedmicYearModel).destroy({
        where: { academicYearId },
    });
    return deleted > 0;
}

/** Active academic years for one institute (optional university filter). */
export async function getActiveAcedmicYearByInstitute(instituteId, universityId) {
    try {
        const where = {
            instituteId: Number(instituteId),
            isActive: true,
        };
        if (universityId != null) {
            where.universityId = Number(universityId);
        }
        return await model.acedmicYearModel.findAll({
            where,
            attributes: listAttributes,
            order: [['createdAt', 'DESC']],
        });
    } catch (error) {
        console.error('Error fetching active acedmicYear by institute:', error);
        throw error;
    }
}
