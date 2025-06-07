import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addacedmicYear(acedmicYearData) {    
    try {
        const result = await model.acedmicYearModel.create(acedmicYearData);
        return result;
    } catch (error) {
        console.error("Error in add acedmicYear :", error);
        throw error;
    }
};

export async function getacedmicYearDetails(universityId) {
    try {
        const acedmicYear = await model.acedmicYearModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
        });

        return acedmicYear;
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function getSingleacedmicYearDetails(acedmicYearId,universityId) {
    try {
        const acedmicYear = await model.acedmicYearModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { acedmicYearId },
            // include:[
            //     {
            //         model: model.userModel,
            //         as: "userAcedmicYear",
            //         attributes: ["universityId", "userId"],
            //         where: { universityId }
            //     },
            // ]
        });

        return acedmicYear;
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}

export async function updateacedmicYear(acedmicYearId, acedmicYearData) {
    console.log(`>>>>>>>>>>>>>acedmicYearId, acedmicYearData`,acedmicYearId, acedmicYearData);
        try {
        const result = await model.acedmicYearModel.update(acedmicYearData, {
            where: { acedmicYearId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating acedmicYear creation ${acedmicYearId}:`, error);
        throw error; 
    }
}

export async function deleteacedmicYear(acedmicYearId) {
    const deleted = await model.acedmicYearModel.destroy({ where: { acedmicYearId: acedmicYearId } });
    return deleted > 0;
}

export async function getAllActiveAcedmicYear(universityId) {
    try {
        const acedmicYear = await model.acedmicYearModel.findAll({
             where: {
                isActive:true
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
        });

        return acedmicYear;
    } catch (error) {
        console.error('Error fetching acedmicYear details:', error);
        throw error;
    }
}