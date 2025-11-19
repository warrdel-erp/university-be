import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addFloor(floorData) {    
    try {
        const result = await model.libraryFloorModel.create(floorData);
        return result;
    } catch (error) {
        console.error("Error in add Floor :", error);
        throw error;
    }
};

export async function getFloorDetails(universityId) {
    try {
        const Floor = await model.libraryFloorModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:{universityId},
            include:[
                {
                    model: model.campusModel,
                    as: "campusFloor",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
                {
                    model: model.instituteModel,
                    as: "instituteFloor",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return Floor;
    } catch (error) {
        console.error('Error fetching Floor details:', error);
        throw error;
    }
}

export async function getSingleFloorDetails(libraryFloorId,universityId) {
    try {
        const floor = await model.libraryFloorModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { libraryFloorId,universityId },
            include:[
                {
                    model: model.campusModel,
                    as: "campusFloor",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
                {
                    model: model.instituteModel,
                    as: "instituteFloor",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return floor;
    } catch (error) {
        console.error('Error fetching Floor details:', error);
        throw error;
    }
}

export async function updateFloor(libraryFloorId, floorData) {
    try {
        const result = await model.libraryFloorModel.update(floorData, {
            where: { libraryFloorId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Floor creation ${libraryFloorId}:`, error);
        throw error; 
    }
}

export async function deleteFloor(libraryFloorId) {
    const deleted = await model.libraryFloorModel.destroy({ where: { libraryFloorId: libraryFloorId } });
    return deleted > 0;
}

// ------------------------ AISLE ------------------------
export async function addAisle(data) {
    return await model.libraryAisleModel.create(data);
}

export async function getAisleDetails(universityId) {
    return await model.libraryAisleModel.findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        include: [
            {
                model: model.libraryFloorModel,
                as: "floor",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where:{universityId}
            }
        ]
    });
}

export async function getSingleAisle(libraryAisleId) {
    return await model.libraryAisleModel.findOne({
        where: { libraryAisleId },
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.libraryFloorModel,
                as: "floor",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
            }
        ]
    });
}

export async function updateAisle(libraryAisleId, data) {
    return await model.libraryAisleModel.update(data, { where: { libraryAisleId } });
}

export async function deleteAisle(libraryAisleId) {
    return await model.libraryAisleModel.destroy({ where: { libraryAisleId } });
}



// ------------------------ RACK ------------------------
export async function addRack(data) {
    return await model.libraryRackModel.create(data);
}

export async function getRackDetails() {
    return await model.libraryRackModel.findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.libraryAisleModel,
                as: "aisle",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
            }
        ]
    });
}

export async function getSingleRack(libraryRackId) {
    return await model.libraryRackModel.findOne({
        where: { libraryRackId },
        include: [
            {
                model: model.libraryAisleModel,
                as: "aisle",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
            }
        ]
    });
}

export async function updateRack(libraryRackId, data) {
    return await model.libraryRackModel.update(data, { where: { libraryRackId } });
}

export async function deleteRack(libraryRackId) {
    return await model.libraryRackModel.destroy({ where: { libraryRackId } });
}

// ------------------------ ROW ------------------------
export async function addRow(data) {
    return await model.libraryRowModel.create(data);
}

export async function getRowDetails() {
    return await model.libraryRowModel.findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.libraryRackModel,
                as: "rack",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
            }
        ]
    });
}

export async function getSingleRow(libraryRowId) {
    return await model.libraryRowModel.findOne({
        where: { libraryRowId },
        include: [
            {
                model: model.libraryRackModel,
                as: "rack",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
            }
        ]
    });
}

export async function updateRow(libraryRowId, data) {
    return await model.libraryRowModel.update(data, { where: { libraryRowId } });
}

export async function deleteRow(libraryRowId) {
    return await model.libraryRowModel.destroy({ where: { libraryRowId } });
}


export async function getAisleIdByName(name) {
    try {
        const aisle = await model.libraryAisleModel.findOne({
            where: { name }
        });

        if (!aisle) throw new Error(`Aisle not found: ${name}`);

        return aisle.libraryAisleId;

    } catch (error) {
        console.error("Error finding aisle:", error);
        throw new Error(error.message);
    }
}

export async function getRackIdByName(name) {
    try {
        const rack = await model.libraryRackModel.findOne({
            where: { name }
        });

        if (!rack) throw new Error(`Rack not found: ${name}`);

        return rack.libraryRackId;

    } catch (error) {
        console.error("Error finding rack:", error);
        throw new Error(error.message);
    }
}

export async function getRowIdByName(name) {
    try {
        const row = await model.libraryRowModel.findOne({
            where: { name }
        });

        if (!row) throw new Error(`Row not found: ${name}`);

        return row.libraryRowId;

    } catch (error) {
        console.error("Error finding row:", error);
        throw new Error(error.message);
    }
};