import * as buildingCreationService  from "../repository/buildingRepository.js";

export async function addbuilding(buildingData, createdBy, updatedBy) {

        buildingData.createdBy = createdBy;
        buildingData.updatedBy = updatedBy;
        const building = await buildingCreationService.addbuilding(buildingData);
        return building;
};

export async function getbuildingDetails(universityId) {
    return await buildingCreationService.getbuildingDetails(universityId);
}

export async function getSinglebuildingDetails(buildingId,universityId) {
    return await buildingCreationService.getSinglebuildingDetails(buildingId,universityId);
}

export async function updatebuilding(buildingId, buildingData, updatedBy) {    
        buildingData.updatedBy = updatedBy;
       return await buildingCreationService.updatebuilding(buildingId, buildingData);
}

export async function deletebuilding(buildingId) {
    return await buildingCreationService.deletebuilding(buildingId);
}