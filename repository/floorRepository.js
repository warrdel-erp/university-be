import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

function floorBuildingInclude() {
    const campusScope = buildScope(model.campusModel);

    return {
        model: model.buildingModel.unscoped(),
        as: "floorBuilding",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        required: true,
        include: [
            {
                model: model.campusModel.unscoped(),
                as: "campusbuilding",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                where: campusScope,
                required: true,
            },
        ],
    };
}

export async function addfloor(floorData) {
    try {
        const result = await scoped(model.floorModel).create(floorData);
        return result;
    } catch (error) {
        console.error("Error in add floor :", error);
        throw error;
    }
};

export async function getfloorDetails() {
    try {
        const floor = await scoped(model.floorModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            include: [floorBuildingInclude()],
        });

        return floor;
    } catch (error) {
        console.error('Error fetching floor details:', error);
        throw error;
    }
}

export async function getSinglefloorDetails(floorId) {
    try {
        const floor = await scoped(model.floorModel).findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { floorId },
            include: [floorBuildingInclude()],
        });

        return floor;
    } catch (error) {
        console.error('Error fetching floor details:', error);
        throw error;
    }
}

export async function updatefloor(floorId, floorData) {
    try {
        const existing = await scoped(model.floorModel).findOne({
            where: { floorId },
            include: [floorBuildingInclude()],
        });
        if (!existing) {
            return [0];
        }

        const result = await scoped(model.floorModel).update(floorData, {
            where: { floorId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating floor creation ${floorId}:`, error);
        throw error;
    }
}

export async function deletefloor(floorId) {
    const existing = await scoped(model.floorModel).findOne({
        where: { floorId },
        include: [floorBuildingInclude()],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.floorModel).destroy({ where: { floorId } });
    return deleted > 0;
}
