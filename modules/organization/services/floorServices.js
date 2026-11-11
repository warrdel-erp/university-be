import * as floorCreationService from "../repository/floorRepository.js";

export async function addfloor(floorData, createdBy, updatedBy) {
    floorData.createdBy = createdBy;
    floorData.updatedBy = updatedBy;
    return await floorCreationService.addfloor(floorData);
};

export async function getfloorDetails() {
    return await floorCreationService.getfloorDetails();
}

export async function getSinglefloorDetails(floorId) {
    return await floorCreationService.getSinglefloorDetails(floorId);
}

export async function updatefloor(floorId, floorData, updatedBy) {
    floorData.updatedBy = updatedBy;
    return await floorCreationService.updatefloor(floorId, floorData);
}

export async function deletefloor(floorId) {
    return await floorCreationService.deletefloor(floorId);
}
