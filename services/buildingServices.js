import * as buildingCreationService from "../repository/buildingRepository.js";
import { getTenantStore } from "../utility/requestContext.js";

export async function addbuilding(buildingData, user, createdBy, updatedBy) {
    const campusId = await buildingCreationService.getCampusIdByInstituteId(getTenantStore().instituteId);
    buildingData.campusId = campusId;
    buildingData.createdBy = createdBy;
    buildingData.updatedBy = updatedBy;
    return await buildingCreationService.addbuilding(buildingData);
}

export async function getbuildingDetails() {
    return await buildingCreationService.getbuildingDetails();
}

export async function getSinglebuildingDetails(buildingId) {
    return await buildingCreationService.getSinglebuildingDetails(buildingId);
}

export async function updatebuilding(buildingId, buildingData, updatedBy) {
    const { campusId: _campusId, buildingId: _buildingId, ...updateData } = buildingData;
    updateData.updatedBy = updatedBy;
    return await buildingCreationService.updatebuilding(buildingId, updateData);
}

export async function deletebuilding(buildingId) {
    return await buildingCreationService.deletebuilding(buildingId);
}

export async function getAllbuildingNested(buildingType, instituteId) {
    return await buildingCreationService.getAllbuildingNested(buildingType, instituteId);
}
