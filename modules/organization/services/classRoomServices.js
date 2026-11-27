import * as ClassRoomCreationService  from "../repository/classRoomRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addClassRoom(ClassRoomData, createdBy, updatedBy) {
    ClassRoomData.createdBy = createdBy;
    ClassRoomData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.CLASS_ROOM_CREATE, async ({ transaction }) => {
        return await ClassRoomCreationService.addClassRoom(ClassRoomData, { transaction });
    });
};

export async function getClassRoomDetails() {
    return await ClassRoomCreationService.getClassRoomDetails();
}

export async function getSingleClassRoomDetails(classRoomSectionId) {
    return await ClassRoomCreationService.getSingleClassRoomDetails(classRoomSectionId);
}

export async function deleteClassRoom(classRoomSectionId) {
    return withAuditEvent(AUDIT_EVENTS.CLASS_ROOM_DELETE, async ({ transaction }) => {
        return await ClassRoomCreationService.deleteClassRoom(classRoomSectionId, { transaction });
    });
}

export async function updateClassRoom(classRoomSectionId, ClassRoomData, updatedBy) {    
    ClassRoomData.updatedBy = updatedBy;
    return withAuditEvent(AUDIT_EVENTS.CLASS_ROOM_UPDATE, async ({ transaction }) => {
        return await ClassRoomCreationService.updateClassRoom(classRoomSectionId, ClassRoomData, { transaction });
    });
}
