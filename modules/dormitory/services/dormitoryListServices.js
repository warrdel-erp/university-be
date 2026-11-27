import * as DormitoryListCreationService from "../repository/dormitoryListRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addDormitoryList(dormitoryListData, createdBy, updatedBy) {
  dormitoryListData.createdBy = createdBy;
  dormitoryListData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.DORMITORY_LIST_CREATE, async ({ transaction }) => {
    return DormitoryListCreationService.addDormitoryList(dormitoryListData, transaction);
  });
}

export async function getDormitoryListDetails() {
  return DormitoryListCreationService.getDormitoryListDetails();
}

export async function getSingleDormitoryListDetails(dormitoryListId) {
  return DormitoryListCreationService.getSingleDormitoryListDetails(dormitoryListId);
}

export async function deleteDormitoryList(dormitoryListId) {
  return withAuditEvent(AUDIT_EVENTS.DORMITORY_LIST_DELETE, async ({ transaction }) => {
    return DormitoryListCreationService.deleteDormitoryList(dormitoryListId, transaction);
  });
}

export async function updateDormitoryList(dormitoryListId, dormitoryListData, updatedBy) {
  dormitoryListData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.DORMITORY_LIST_UPDATE, async ({ transaction }) => {
    return DormitoryListCreationService.updateDormitoryList(dormitoryListId, dormitoryListData, transaction);
  });
}
