import * as model from '../models/index.js'
import { Op } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';

const caseInsensitiveName = (name) =>
    sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), String(name).toLowerCase());

export async function createLibrary(payload, transaction) {
    try {
        return await model.libraryCreationModel.create(payload, { transaction });
    } catch (error) {
        console.error("Repository createLibrary error:", error);
        throw error;
    }
}

export async function createFloor(payload, transaction) {
    try {
        return await model.libraryFloorModel.create(payload, { transaction });
    } catch (error) {
        console.error("Repository createFloor error:", error);
        throw error;
    }
}

export async function addFloor(data) {
    return model.libraryFloorModel.create(data);
}

export async function findLibraryByInstituteAndName(instituteId, name, excludeLibraryId) {
    const where = { instituteId, [Op.and]: [caseInsensitiveName(name)] };
    if (excludeLibraryId) where.libraryCreationId = { [Op.ne]: excludeLibraryId };
    return model.libraryCreationModel.findOne({ where });
}

export async function findLibraryById(libraryCreationId) {
    return model.libraryCreationModel.findOne({
        where: { libraryCreationId },
        attributes: ["libraryCreationId", "instituteId", "name"],
    });
}

export async function findFloorByLibraryAndName(libraryCreationId, name, excludeFloorId) {
    const where = { libraryCreationId, [Op.and]: [caseInsensitiveName(name)] };
    if (excludeFloorId) where.libraryFloorId = { [Op.ne]: excludeFloorId };
    return model.libraryFloorModel.findOne({ where });
}

export async function findFloorByInstituteUniversityAndName(instituteId, universityId, name, excludeFloorId) {
    const where = {
        instituteId,
        universityId,
        libraryCreationId: { [Op.is]: null },
        [Op.and]: [caseInsensitiveName(name)],
    };
    if (excludeFloorId) where.libraryFloorId = { [Op.ne]: excludeFloorId };
    return model.libraryFloorModel.findOne({ where });
}

export async function findFloorByIdForNameCheck(libraryFloorId) {
    return model.libraryFloorModel.findOne({
        where: { libraryFloorId },
        attributes: ["libraryFloorId", "libraryCreationId", "instituteId", "universityId"],
    });
}


export async function getFloorDetails(universityId, instituteId) {    
    try {
        const Floor = await model.libraryFloorModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where: {
                universityId,
                ...(instituteId && { instituteId }),
            },
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

export async function getSingleFloorDetails(libraryFloorId, universityId, instituteId) {
    try {
        return await model.libraryFloorModel.findOne({
            attributes: { 
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
            },
            where: {
                libraryFloorId,
                universityId,
                ...(instituteId && { instituteId }),
            },

            include: [
                {
                    model: model.campusModel,
                    as: "campusFloor",
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                    },
                    where: { universityId },
                },
                {
                    model: model.instituteModel,
                    as: "instituteFloor",
                    attributes: { 
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] 
                    },
                    where: { universityId },
                },
                {
                    model: model.libraryAisleModel,
                    as: "aisles",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    required: false,
                    include: [
                        {
                            model: model.libraryRackModel,
                            as: "racks",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            required: false,
                            include: [
                                {
                                    model: model.libraryRowModel,
                                    as: "rows",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ]
        });

    } catch (error) {
        console.error("Error fetching Floor details:", error);
        throw error;
    }
};

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

export async function findFloorById(libraryFloorId, universityId, instituteId, transaction) {
    return model.libraryFloorModel.findOne({
        where: {
            libraryFloorId,
            universityId,
            ...(instituteId && { instituteId }),
        },
        attributes: ["libraryFloorId", "libraryCreationId", "campusId", "instituteId", "universityId"],
        transaction,
    });
}

export async function findFloorStructureById(libraryFloorId, universityId, instituteId) {
    return model.libraryFloorModel.findOne({
        attributes: ["libraryFloorId", "libraryCreationId", "name", "description"],
        where: {
            libraryFloorId,
            universityId,
            ...(instituteId && { instituteId }),
        },
        include: [
            {
                model: model.libraryAisleModel,
                as: "aisles",
                attributes: ["libraryAisleId", "libraryFloorId", "name", "description"],
                required: false,
                include: [
                    {
                        model: model.libraryRackModel,
                        as: "racks",
                        attributes: ["libraryRackId", "libraryAisleId", "name", "description"],
                        required: false,
                        include: [
                            {
                                model: model.libraryRowModel,
                                as: "rows",
                                attributes: ["libraryRowId", "libraryRackId", "name", "description"],
                                required: false,
                            },
                        ],
                    },
                ],
            },
        ],
    });
}

export async function getMaxNumericAisleNameByFloorId(libraryFloorId, transaction) {
    const row = await model.libraryAisleModel.findOne({
        attributes: [
          [
            sequelize.literal("MAX(CAST(`name` AS UNSIGNED))"),
            "maxName",
          ],
        ],
        where: { libraryFloorId },
        transaction,
        raw: true,
      });
    const maxName = Number(row?.maxName);
    return Number.isNaN(maxName) ? 0 : maxName;
}

export async function bulkCreateAisles(rows, transaction) {
    return model.libraryAisleModel.bulkCreate(rows, { transaction });
}

export async function bulkCreateRacks(rows, transaction) {
    return model.libraryRackModel.bulkCreate(rows, { transaction });
}

export async function bulkCreateRows(rows, transaction) {
    return model.libraryRowModel.bulkCreate(rows, { transaction });
}

// ------------------------ AISLE ------------------------
export async function findAisleByFloorAndName(libraryFloorId, name, excludeAisleId) {
    const where = { libraryFloorId, [Op.and]: [caseInsensitiveName(name)] };
    if (excludeAisleId) where.libraryAisleId = { [Op.ne]: excludeAisleId };
    return model.libraryAisleModel.findOne({ where });
}

export async function findRackByAisleAndName(libraryAisleId, name, excludeRackId) {
    const where = { libraryAisleId, [Op.and]: [caseInsensitiveName(name)] };
    if (excludeRackId) where.libraryRackId = { [Op.ne]: excludeRackId };
    return model.libraryRackModel.findOne({ where });
}

export async function addAisle(data) {
    return await model.libraryAisleModel.create(data);
}

export async function getAisleDetails(universityId, instituteId) {
    return await model.libraryAisleModel.findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        include: [
            {
                model: model.libraryFloorModel,
                as: "floor",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where: {
                    universityId,
                    ...(instituteId && { instituteId }),
                },
                required: true,
            },
        ],
    });
}

export async function getSingleAisle(libraryAisleId, universityId, instituteId) {
    return await model.libraryAisleModel.findOne({
        where: { libraryAisleId },
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.libraryFloorModel,
                as: "floor",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where: {
                    universityId,
                    ...(instituteId && { instituteId }),
                },
                required: true,
            },
        ],
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

export async function getRackDetails(universityId, instituteId) {
    return await model.libraryRackModel.findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.libraryAisleModel,
                as: "aisle",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                required: true,
                include: [
                    {
                        model: model.libraryFloorModel,
                        as: "floor",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        where: {
                            universityId,
                            ...(instituteId && { instituteId }),
                        },
                        required: true,
                    },
                ],
            },
        ],
    });
}

export async function getSingleRack(libraryRackId, universityId, instituteId) {
    return await model.libraryRackModel.findOne({
        where: { libraryRackId },
        include: [
            {
                model: model.libraryAisleModel,
                as: "aisle",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                required: true,
                include: [
                    {
                        model: model.libraryFloorModel,
                        as: "floor",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        where: {
                            universityId,
                            ...(instituteId && { instituteId }),
                        },
                        required: true,
                    },
                ],
            },
        ],
    });
}

export async function updateRack(libraryRackId, data) {
    return await model.libraryRackModel.update(data, { where: { libraryRackId } });
}

export async function deleteRack(libraryRackId) {
    return await model.libraryRackModel.destroy({ where: { libraryRackId } });
}

// ------------------------ ROW ------------------------
export async function findRowByRackAndName(libraryRackId, name, excludeRowId) {
    const where = { libraryRackId, [Op.and]: [caseInsensitiveName(name)] };
    if (excludeRowId) where.libraryRowId = { [Op.ne]: excludeRowId };
    return model.libraryRowModel.findOne({ where });
}

export async function addRow(data) {
    return await model.libraryRowModel.create(data);
}

export async function getRowDetails(universityId, instituteId) {
    return await model.libraryRowModel.findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: model.libraryRackModel,
                as: "rack",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                required: true,
                include: [
                    {
                        model: model.libraryAisleModel,
                        as: "aisle",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        required: true,
                        include: [
                            {
                                model: model.libraryFloorModel,
                                as: "floor",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                where: {
                                    universityId,
                                    ...(instituteId && { instituteId }),
                                },
                                required: true,
                            },
                        ],
                    },
                ],
            },
        ],
    });
}

export async function getSingleRow(libraryRowId, universityId, instituteId) {
    return await model.libraryRowModel.findOne({
        where: { libraryRowId },
        include: [
            {
                model: model.libraryRackModel,
                as: "rack",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                required: true,
                include: [
                    {
                        model: model.libraryAisleModel,
                        as: "aisle",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        required: true,
                        include: [
                            {
                                model: model.libraryFloorModel,
                                as: "floor",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                where: {
                                    universityId,
                                    ...(instituteId && { instituteId }),
                                },
                                required: true,
                            },
                        ],
                    },
                ],
            },
        ],
    });
}

export async function updateRow(libraryRowId, data) {
    return await model.libraryRowModel.update(data, { where: { libraryRowId } });
}

export async function deleteRow(libraryRowId) {
    return await model.libraryRowModel.destroy({ where: { libraryRowId } });
}


export async function getLibraryCreationIdByInstituteAndName(instituteId, name) {
    const library = await findLibraryByInstituteAndName(instituteId, name);
    if (!library) throw new Error(`Library not found: ${name}`);
    return library.libraryCreationId;
}

export async function getFloorIdByLibraryAndName(libraryCreationId, name) {
    const floor = await findFloorByLibraryAndName(libraryCreationId, name);
    if (!floor) throw new Error(`Floor not found: ${name}`);
    return floor.libraryFloorId;
}

export async function getAisleIdByFloorAndName(libraryFloorId, name) {
    const aisle = await findAisleByFloorAndName(libraryFloorId, name);
    if (!aisle) throw new Error(`Aisle not found: ${name}`);
    return aisle.libraryAisleId;
}

export async function getAisleIdByLibraryAndName(libraryCreationId, name) {
    const aisle = await model.libraryAisleModel.findOne({
        where: { [Op.and]: [caseInsensitiveName(name)] },
        include: [{
            model: model.libraryFloorModel,
            as: "floor",
            where: { libraryCreationId },
            required: true,
            attributes: [],
        }],
    });
    if (!aisle) throw new Error(`Aisle not found: ${name}`);
    return aisle.libraryAisleId;
}

export async function getRackIdByAisleAndName(libraryAisleId, name) {
    const rack = await findRackByAisleAndName(libraryAisleId, name);
    if (!rack) throw new Error(`Rack not found: ${name}`);
    return rack.libraryRackId;
}

export async function getRowIdByRackAndName(libraryRackId, name) {
    const row = await findRowByRackAndName(libraryRackId, name);
    if (!row) throw new Error(`Row not found: ${name}`);
    return row.libraryRowId;
}