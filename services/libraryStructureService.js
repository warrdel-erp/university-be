import * as libraryStructureRepository  from "../repository/libraryStructureRepository.js";

export async function addFloor(floorData, createdBy, updatedBy,universityId) {

        floorData.createdBy = createdBy;
        floorData.updatedBy = updatedBy;
        floorData.universityId = universityId;
        const Floor = await libraryStructureRepository.addFloor(floorData);
        return Floor;
};

export async function getFloorDetails(universityId, instituteId) {
    return await libraryStructureRepository.getFloorDetails(universityId, instituteId);
}

export async function getSingleFloorDetails(libraryFloorId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleFloorDetails(libraryFloorId, universityId, instituteId);
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

export async function getAisleDetails(universityId, instituteId) {
    return await libraryStructureRepository.getAisleDetails(universityId, instituteId);
}

export async function getSingleAisle(libraryAisleId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleAisle(libraryAisleId, universityId, instituteId);
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

export async function getRackDetails(universityId, instituteId) {
    return await libraryStructureRepository.getRackDetails(universityId, instituteId);
}

export async function getSingleRack(libraryRackId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleRack(libraryRackId, universityId, instituteId);
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

export async function getRowDetails(universityId, instituteId) {
    return await libraryStructureRepository.getRowDetails(universityId, instituteId);
}

export async function getSingleRow(libraryRowId, universityId, instituteId) {
    return await libraryStructureRepository.getSingleRow(libraryRowId, universityId, instituteId);
}

export async function updateRow(libraryRowId, rowData, updatedBy) {
    rowData.updatedBy = updatedBy;
    return await libraryStructureRepository.updateRow(libraryRowId, rowData);
}

export async function deleteRow(libraryRowId) {
    return await libraryStructureRepository.deleteRow(libraryRowId);
}