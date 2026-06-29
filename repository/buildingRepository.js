import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

function campusBuildingInclude() {
    const campusScope = buildScope(model.campusModel);

    return {
        model: model.campusModel,
        as: "campusbuilding",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        where: campusScope,
        required: true,
    };
}

export async function getCampusIdByInstituteId(instituteId) {
    const institute = await scoped(model.instituteModel).findOne({
        where: { instituteId },
        attributes: ['campusId'],
    });

    if (!institute?.campusId) {
        throw new Error('Campus not found for user default institute');
    }

    return institute.campusId;
}

export async function addbuilding(buildingData) {
    try {
        const result = await scoped(model.buildingModel).create(buildingData);
        return result;
    } catch (error) {
        console.error("Error in add building :", error);
        throw error;
    }
};

export async function getbuildingDetails() {
    try {
        const building = await scoped(model.buildingModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            include: [campusBuildingInclude()],
        });

        return building;
    } catch (error) {
        console.error('Error fetching building details:', error);
        throw error;
    }
}

export async function getSinglebuildingDetails(buildingId) {
    try {
        const building = await scoped(model.buildingModel).findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { buildingId },
            include: [campusBuildingInclude()],
        });

        return building;
    } catch (error) {
        console.error('Error fetching building details:', error);
        throw error;
    }
}

export async function updatebuilding(buildingId, buildingData) {
    try {
        const existing = await scoped(model.buildingModel).findOne({
            where: { buildingId },
            include: [campusBuildingInclude()],
        });
        if (!existing) {
            return [0];
        }

        const result = await scoped(model.buildingModel).update(buildingData, {
            where: { buildingId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating building creation ${buildingId}:`, error);
        throw error;
    }
}

export async function deletebuilding(buildingId) {
    const existing = await scoped(model.buildingModel).findOne({
        where: { buildingId },
        include: [campusBuildingInclude()],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.buildingModel).destroy({ where: { buildingId } });
    return deleted > 0;
}

export async function getAllbuildingNested(buildingType) {
    try {
        const classRoomScope = buildScope(model.classRoomModel);

        const building = await scoped(model.buildingModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: {
                ...(buildingType && { buildingType }),
            },
            include: [
                campusBuildingInclude(),
                {
                    model: model.floorModel,
                    as: "floorBuilding",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    required: false,
                    include: [
                        {
                            model: model.classRoomModel,
                            as: "roomFloor",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                            where: classRoomScope,
                            required: false,
                        },
                    ],
                },
            ],
        });
        return building;
    } catch (error) {
        console.error("Error fetching nested building details:", error);
        throw error;
    }
}
