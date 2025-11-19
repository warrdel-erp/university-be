import * as libraryStructureRepository  from "../repository/libraryStructureRepository.js";

export async function addFloor(floorData, createdBy, updatedBy,universityId) {

        floorData.createdBy = createdBy;
        floorData.updatedBy = updatedBy;
        floorData.universityId = universityId;
        const Floor = await libraryStructureRepository.addFloor(floorData);
        return Floor;
};

export async function getFloorDetails(universityId) {
    return await libraryStructureRepository.getFloorDetails(universityId);
}

export async function getSingleFloorDetails(libraryFloorId,universityId) {
    return await libraryStructureRepository.getSingleFloorDetails(libraryFloorId,universityId);
}

export async function updateFloor(libraryFloorId, floorData, updatedBy) {    
        floorData.updatedBy = updatedBy;
       return await libraryStructureRepository.updateFloor(libraryFloorId, floorData);
}

export async function deleteFloor(libraryFloorId) {
    return await libraryStructureRepository.deleteFloor(libraryFloorId);
}

// ------------------------ AISLE ------------------------
export async function addAisle(aisleData, createdBy, updatedBy) {
    aisleData.createdBy = createdBy;
    aisleData.updatedBy = updatedBy;
    return await libraryStructureRepository.addAisle(aisleData);
}

export async function getAisleDetails(universityId) {
    return await libraryStructureRepository.getAisleDetails(universityId);
}

export async function getSingleAisle(libraryAisleId) {
    return await libraryStructureRepository.getSingleAisle(libraryAisleId);
}

export async function updateAisle(libraryAisleId, aisleData, updatedBy) {
    aisleData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateAisle(libraryAisleId, aisleData);
}

export async function deleteAisle(libraryAisleId) {
    return await libraryStructureRepository.deleteAisle(libraryAisleId);
}



// ------------------------ RACK ------------------------
export async function addRack(rackData, createdBy, updatedBy) {
    rackData.createdBy = createdBy;
    rackData.updatedBy = updatedBy;
    return await libraryStructureRepository.addRack(rackData);
}

export async function getRackDetails() {
    return await libraryStructureRepository.getRackDetails();
}

export async function getSingleRack(libraryRackId) {
    return await libraryStructureRepository.getSingleRack(libraryRackId);
}

export async function updateRack(libraryRackId, rackData, updatedBy) {
    rackData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateRack(libraryRackId, rackData);
}

export async function deleteRack(libraryRackId) {
    return await libraryStructureRepository.deleteRack(libraryRackId);
}



// ------------------------ ROW ------------------------
export async function addRow(rowData, createdBy, updatedBy) {
    rowData.createdBy = createdBy;
    rowData.updatedBy = updatedBy;
    return await libraryStructureRepository.addRow(rowData);
}

export async function getRowDetails() {
    return await libraryStructureRepository.getRowDetails();
}

export async function getSingleRow(libraryRowId) {
    return await libraryStructureRepository.getSingleRow(libraryRowId);
}

export async function updateRow(libraryRowId, rowData, updatedBy) {
    rowData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateRow(libraryRowId, rowData);
}

export async function deleteRow(libraryRowId) {
    return await libraryStructureRepository.deleteRow(libraryRowId);
}