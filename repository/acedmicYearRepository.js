import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { scoped } from '../utility/scoped.js';

const listAttributes = { exclude: ['updatedAt', 'deletedAt'] };

export async function addacedmicYear(acedmicYearData) {
    try {
        return await scoped(model.acedmicYearModel).create(acedmicYearData);
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

export async function getSingleacedmicYearDetails(acedmicYearId) {
    try {
        return await scoped(model.acedmicYearModel).findOne({
            attributes: listAttributes,
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
export async function claimUniversityAcedmicYear(acedmicYearId, universityId, acedmicYearData) {
    try {
        const [updated] = await model.acedmicYearModel.update(acedmicYearData, {
            where: {
                acedmicYearId,
                universityId,
                instituteId: { [Op.is]: null },
            },
        });
        if (!updated) {
            return null;
        }
        return await scoped(model.acedmicYearModel).findOne({
            where: { acedmicYearId },
            attributes: listAttributes,
        });
    } catch (error) {
        console.error(`Error claiming acedmicYear ${acedmicYearId}:`, error);
        throw error;
    }
}

export async function deactivateAllAcedmicYears(updatedBy) {
    return await scoped(model.acedmicYearModel).update(
        { isActive: false, updatedBy },
        { where: { isActive: true } },
    );
}

export async function updateacedmicYear(acedmicYearId, acedmicYearData) {
    try {
        const existing = await scoped(model.acedmicYearModel).findOne({
            where: { acedmicYearId },
            attributes: ['acedmicYearId'],
        });
        if (!existing) {
            return false;
        }

        await scoped(model.acedmicYearModel).update(acedmicYearData, {
            where: { acedmicYearId },
        });
        return true;
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

/** Active academic years for one institute (instituteId + isActive only). */
export async function getActiveAcedmicYearByInstitute(instituteId) {
    try {
        return await model.acedmicYearModel.findAll({
            where: { instituteId, isActive: true },
            attributes: listAttributes,
            order: [['createdAt', 'DESC']],
        });
    } catch (error) {
        console.error('Error fetching active acedmicYear by institute:', error);
        throw error;
    }
}
