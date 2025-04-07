import * as floorCreationService  from "../repository/floorRepository.js";

export async function addfloor(floorData, createdBy, updatedBy) {

        floorData.createdBy = createdBy;
        floorData.updatedBy = updatedBy;
        const floor = await floorCreationService.addfloor(floorData);
        return floor;
};

export async function getfloorDetails(universityId) {
    return await floorCreationService.getfloorDetails(universityId);
}

export async function getSinglefloorDetails(floorId,universityId) {
    return await floorCreationService.getSinglefloorDetails(floorId,universityId);
}

export async function updatefloor(floorId, floorData, updatedBy) {    
        floorData.updatedBy = updatedBy;
       return await floorCreationService.updatefloor(floorId, floorData);
}

export async function deletefloor(floorId) {
    return await floorCreationService.deletefloor(floorId);
}