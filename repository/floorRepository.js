import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addfloor(floorData) {    
    try {
        const result = await model.floorModel.create(floorData);
        return result;
    } catch (error) {
        console.error("Error in add floor :", error);
        throw error;
    }
};

export async function getfloorDetails(universityId) {
    try {
        const floor = await model.floorModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            include:[
                {
                    model: model.buildingModel,
                    as: "floorBuilding",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return floor;
    } catch (error) {
        console.error('Error fetching floor details:', error);
        throw error;
    }
}

export async function getSinglefloorDetails(floorId,universityId) {
    try {
        const floor = await model.floorModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { floorId },
            include:[
                {
                    model: model.buildingModel,
                    as: "floorBuilding",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return floor;
    } catch (error) {
        console.error('Error fetching floor details:', error);
        throw error;
    }
}

export async function updatefloor(floorId, floorData) {
    try {
        const result = await model.floorModel.update(floorData, {
            where: { floorId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating floor creation ${floorId}:`, error);
        throw error; 
    }
}

export async function deletefloor(floorId) {
    const deleted = await model.floorModel.destroy({ where: { floorId: floorId } });
    return deleted > 0;
}