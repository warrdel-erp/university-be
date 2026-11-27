import * as RoomTypeCreationService from "../repository/roomTypeRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addRoomType(roomTypeData, createdBy, updatedBy) {
    roomTypeData.createdBy = createdBy;
    roomTypeData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.ROOM_TYPE_CREATE, async ({ transaction }) => {
        return RoomTypeCreationService.addRoomType(roomTypeData, transaction);
    });
}

export async function getRoomTypeDetails() {
    return await RoomTypeCreationService.getRoomTypeDetails();
}

export async function getSingleRoomTypeDetails(roomTypeId) {
    return await RoomTypeCreationService.getSingleRoomTypeDetails(roomTypeId);
}

export async function deleteRoomType(roomTypeId) {
    return withAuditEvent(AUDIT_EVENTS.ROOM_TYPE_DELETE, async ({ transaction }) => {
        return RoomTypeCreationService.deleteRoomType(roomTypeId, transaction);
    });
}

export async function updateRoomType(roomTypeId, roomTypeData, updatedBy) {
    roomTypeData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.ROOM_TYPE_UPDATE, async ({ transaction }) => {
        return RoomTypeCreationService.updateRoomType(roomTypeId, roomTypeData, transaction);
    });
}
