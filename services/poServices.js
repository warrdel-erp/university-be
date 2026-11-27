import * as poCreationService from "../repository/poRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addPo(poData, createdBy, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.PO_CREATE, async ({ transaction }) => {
    poData.createdBy = createdBy;
    poData.updatedBy = updatedBy;
    return poCreationService.addPo(poData, { transaction });
  });
}

export async function getPoDetails() {
  return poCreationService.getPoDetails();
}

export async function getSinglePoDetails(poId) {
  return poCreationService.getSinglePoDetails(poId);
}

export async function updatePo(poId, poData, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.PO_UPDATE, async ({ transaction }) => {
    poData.updatedBy = updatedBy;
    return poCreationService.updatePo(poId, poData, { transaction });
  });
}

export async function deletePo(poId) {
  return withAuditEvent(AUDIT_EVENTS.PO_DELETE, async ({ transaction }) => {
    return poCreationService.deletePo(poId, { transaction });
  });
}
