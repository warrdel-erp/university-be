import * as DormitoryRoomCreationService from "../repository/addDormitoryRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addDormitoryRoom(DormitoryRoomData, createdBy, updatedBy) {
  DormitoryRoomData.createdBy = createdBy;
  DormitoryRoomData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.DORMITORY_ROOM_CREATE, async ({ transaction }) => {
    return DormitoryRoomCreationService.addDormitoryRoom(DormitoryRoomData, transaction);
  });
}

export async function getDormitoryRoomDetails() {
  return DormitoryRoomCreationService.getDormitoryRoomDetails();
}

export async function getSingleDormitoryRoomDetails(dormitoryListId) {
  return DormitoryRoomCreationService.getSingleDormitoryRoomDetails(dormitoryListId);
}

export async function deleteDormitoryRoom(dormitoryListId) {
  return withAuditEvent(AUDIT_EVENTS.DORMITORY_ROOM_DELETE, async ({ transaction }) => {
    return DormitoryRoomCreationService.deleteDormitoryRoom(dormitoryListId, transaction);
  });
}

export async function updateDormitoryRoom(dormitoryListId, DormitoryRoomData, updatedBy) {
  DormitoryRoomData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.DORMITORY_ROOM_UPDATE, async ({ transaction }) => {
    return DormitoryRoomCreationService.updateDormitoryRoom(dormitoryListId, DormitoryRoomData, transaction);
  });
}
