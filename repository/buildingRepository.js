import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function getCampusIdByInstituteId(instituteId) {
    const institute = await model.instituteModel.findOne({
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




export async function getAllbuildingNested(universityId, buildingType, instituteId) {
    try {
        let campusIds = [];

        if (instituteId) {
            const campusId = await getCampusIdByInstituteId(instituteId);
            const campus = await model.campusModel.findOne({
                where: { campusId, universityId },
                attributes: ["campusId"],
            });
            if (campus) {
                campusIds = [campus.campusId];
            }
        } else {
            const campuses = await model.campusModel.findAll({
                where: { universityId },
                attributes: ["campusId"],
            });
            campusIds = campuses.map((campus) => campus.campusId);
        }

        if (!campusIds.length) {
            return [];
        }

        const building = await model.buildingModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: {
                campusId: { [Op.in]: campusIds },
                ...(buildingType && { buildingType }),
            },
            include: [
                {
                    model: model.campusModel,
                    as: "campusbuilding",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    where: { universityId },
                    required: true,
                },
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