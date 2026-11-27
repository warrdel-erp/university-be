import * as floorCreationService from "../repository/floorRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addfloor(floorData, createdBy, updatedBy) {
    floorData.createdBy = createdBy;
    floorData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.FLOOR_CREATE, async ({ transaction }) => {
        return await floorCreationService.addfloor(floorData, transaction);
    });
}

export async function getfloorDetails() {
    return await floorCreationService.getfloorDetails();
}

export async function getSinglefloorDetails(floorId) {
    return await floorCreationService.getSinglefloorDetails(floorId);
}

export async function updatefloor(floorId, floorData, updatedBy) {
    floorData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.FLOOR_UPDATE, async ({ transaction }) => {
        return await floorCreationService.updatefloor(floorId, floorData, transaction);
    });
}

export async function deletefloor(floorId) {
    return withAuditEvent(AUDIT_EVENTS.FLOOR_DELETE, async ({ transaction }) => {
        return await floorCreationService.deletefloor(floorId, transaction);
    });
}
