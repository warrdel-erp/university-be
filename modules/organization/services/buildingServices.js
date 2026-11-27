import * as buildingCreationService from "../repository/buildingRepository.js";
import { getTenantStore } from "../../../utility/requestContext.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addbuilding(buildingData, user, createdBy, updatedBy) {
    const campusId = await buildingCreationService.getCampusIdByInstituteId(getTenantStore().instituteId);
    buildingData.campusId = campusId;
    buildingData.createdBy = createdBy;
    buildingData.updatedBy = updatedBy;
    if (buildingData.openingTime === '' || buildingData.openingTime === undefined) {
        buildingData.openingTime = null;
    }
    if (buildingData.closingTime === '' || buildingData.closingTime === undefined) {
        buildingData.closingTime = null;
    }
    return withAuditEvent(AUDIT_EVENTS.BUILDING_CREATE, async ({ transaction }) => {
        return await buildingCreationService.addbuilding(buildingData, transaction);
    });
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
    if (updateData.openingTime === '') {
        updateData.openingTime = null;
    }
    if (updateData.closingTime === '') {
        updateData.closingTime = null;
    }
    return withAuditEvent(AUDIT_EVENTS.BUILDING_UPDATE, async ({ transaction }) => {
        return await buildingCreationService.updatebuilding(buildingId, updateData, transaction);
    });
}

export async function deletebuilding(buildingId) {
    return withAuditEvent(AUDIT_EVENTS.BUILDING_DELETE, async ({ transaction }) => {
        return await buildingCreationService.deletebuilding(buildingId, transaction);
    });
}

export async function getAllbuildingNested(buildingType) {
    return await buildingCreationService.getAllbuildingNested(buildingType);
}
