import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addbuilding(buildingData) {    
    try {
        const result = await model.buildingModel.create(buildingData);
        return result;
    } catch (error) {
        console.error("Error in add building :", error);
        throw error;
    }
};

export async function getbuildingDetails(universityId) {
    try {
        const building = await model.buildingModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model: model.campusModel,
                    as: "campusbuilding",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return building;
    } catch (error) {
        console.error('Error fetching building details:', error);
        throw error;
    }
}

export async function getSinglebuildingDetails(buildingId,universityId) {
    try {
        const building = await model.buildingModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { buildingId },
            include:[
                {
                    model: model.campusModel,
                    as: "campusbuilding",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return building;
    } catch (error) {
        console.error('Error fetching building details:', error);
        throw error;
    }
}

export async function updatebuilding(buildingId, buildingData) {
    try {
        const result = await model.buildingModel.update(buildingData, {
            where: { buildingId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating building creation ${buildingId}:`, error);
        throw error; 
    }
}

export async function deletebuilding(buildingId) {
    const deleted = await model.buildingModel.destroy({ where: { buildingId: buildingId } });
    return deleted > 0;
}