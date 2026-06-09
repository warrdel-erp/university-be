import * as libraryStructureRepository  from "../repository/libraryStructureRepository.js";

export async function addFloor(floorData, createdBy, updatedBy,universityId) {
        if (floorData.libraryCreationId) {
            if (await libraryStructureRepository.findFloorByLibraryAndName(floorData.libraryCreationId, floorData.name)) {
                throw new Error(`Floor name '${floorData.name}' already exists`);
            }
        } else if (await libraryStructureRepository.findFloorByInstituteUniversityAndName(floorData.instituteId, universityId, floorData.name)) {
            throw new Error(`Floor name '${floorData.name}' already exists`);
        }
        floorData.createdBy = createdBy;
        floorData.updatedBy = updatedBy;
        floorData.universityId = universityId;
        return await libraryStructureRepository.addFloor(floorData);
};

export async function getFloorDetails(universityId, instituteId) {
    return await libraryStructureRepository.getFloorDetails(universityId, instituteId);
}

export async function getSingleFloorDetails(libraryFloorId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleFloorDetails(libraryFloorId, universityId, instituteId);
}

export async function updateFloor(libraryFloorId, floorData, updatedBy) {
    if (floorData.name) {
        const floor = await libraryStructureRepository.findFloorByIdForNameCheck(libraryFloorId);
        const libraryCreationId = floorData.libraryCreationId ?? floor.libraryCreationId;
        const instituteId = floorData.instituteId ?? floor.instituteId;
        const universityId = floorData.universityId ?? floor.universityId;
        const duplicate = libraryCreationId
            ? await libraryStructureRepository.findFloorByLibraryAndName(libraryCreationId, floorData.name, libraryFloorId)
            : await libraryStructureRepository.findFloorByInstituteUniversityAndName(instituteId, universityId, floorData.name, libraryFloorId);
        if (duplicate) throw new Error(`Floor name '${floorData.name}' already exists`);
    }
    floorData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateFloor(libraryFloorId, floorData);
}

export async function deleteFloor(libraryFloorId) {
    return await libraryStructureRepository.deleteFloor(libraryFloorId);
}

// ------------------------ AISLE ------------------------
export async function addAisle(aisleData, createdBy, updatedBy) {
    if (await libraryStructureRepository.findAisleByFloorAndName(aisleData.libraryFloorId, aisleData.name)) {
        throw new Error(`Aisle name '${aisleData.name}' already exists`);
    }
    aisleData.createdBy = createdBy;
    aisleData.updatedBy = updatedBy;
    return await libraryStructureRepository.addAisle(aisleData);
}

export async function getAisleDetails(universityId, instituteId) {
    return await libraryStructureRepository.getAisleDetails(universityId, instituteId);
}

export async function getSingleAisle(libraryAisleId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleAisle(libraryAisleId, universityId, instituteId);
}

export async function updateAisle(libraryAisleId, aisleData, updatedBy) {
    if (aisleData.name) {
        const aisle = await libraryStructureRepository.getSingleAisle(libraryAisleId);
        const floorId = aisleData.libraryFloorId ?? aisle.libraryFloorId;
        if (await libraryStructureRepository.findAisleByFloorAndName(floorId, aisleData.name, libraryAisleId)) {
            throw new Error(`Aisle name '${aisleData.name}' already exists`);
        }
    }
    aisleData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateAisle(libraryAisleId, aisleData);
}

export async function deleteAisle(libraryAisleId) {
    return await libraryStructureRepository.deleteAisle(libraryAisleId);
}



// ------------------------ RACK ------------------------
export async function addRack(rackData, createdBy, updatedBy) {
    if (await libraryStructureRepository.findRackByAisleAndName(rackData.libraryAisleId, rackData.name)) {
        throw new Error(`Rack name '${rackData.name}' already exists in this aisle`);
    }
    rackData.createdBy = createdBy;
    rackData.updatedBy = updatedBy;
    return await libraryStructureRepository.addRack(rackData);
}

export async function getRackDetails(universityId, instituteId) {
    return await libraryStructureRepository.getRackDetails(universityId, instituteId);
}

export async function getSingleRack(libraryRackId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleRack(libraryRackId, universityId, instituteId);
}

export async function updateRack(libraryRackId, rackData, updatedBy) {
    if (rackData.name) {
        const rack = await libraryStructureRepository.getSingleRack(libraryRackId);
        const aisleId = rackData.libraryAisleId ?? rack.libraryAisleId;
        if (await libraryStructureRepository.findRackByAisleAndName(aisleId, rackData.name, libraryRackId)) {
            throw new Error(`Rack name '${rackData.name}' already exists in this aisle`);
        }
    }
    rackData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateRack(libraryRackId, rackData);
}

export async function deleteRack(libraryRackId) {
    return await libraryStructureRepository.deleteRack(libraryRackId);
}



// ------------------------ ROW ------------------------
export async function addRow(rowData, createdBy, updatedBy) {
    if (await libraryStructureRepository.findRowByRackAndName(rowData.libraryRackId, rowData.name)) {
        throw new Error(`Row name '${rowData.name}' already exists in this rack`);
    }
    rowData.createdBy = createdBy;
    rowData.updatedBy = updatedBy;
    return await libraryStructureRepository.addRow(rowData);
}

export async function getRowDetails(universityId, instituteId) {
    return await libraryStructureRepository.getRowDetails(universityId, instituteId);
}

export async function getSingleRow(libraryRowId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleRow(libraryRowId, universityId, instituteId);
}

export async function updateRow(libraryRowId, rowData, updatedBy) {
    if (rowData.name) {
        const row = await libraryStructureRepository.getSingleRow(libraryRowId);
        const rackId = rowData.libraryRackId ?? row.libraryRackId;
        if (await libraryStructureRepository.findRowByRackAndName(rackId, rowData.name, libraryRowId)) {
            throw new Error(`Row name '${rowData.name}' already exists in this rack`);
        }
    }
    rowData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateRow(libraryRowId, rowData);
}

export async function deleteRow(libraryRowId) {
    return await libraryStructureRepository.deleteRow(libraryRowId);
}