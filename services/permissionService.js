import * as PermissionCreationService from "../repository/permissionRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addPermission(PermissionData) {
  return withAuditEvent(AUDIT_EVENTS.PERMISSION_CREATE, async ({ transaction }) => {
    return PermissionCreationService.addPermission(PermissionData, { transaction });
  });
}

export async function getPermissionDetails() {
  return PermissionCreationService.getPermissionDetails();
}

export async function getSinglePermissionDetails(PermissionId) {
  return PermissionCreationService.getSinglePermissionDetails(PermissionId);
}

export async function deletePermission(permissionId) {
  return withAuditEvent(AUDIT_EVENTS.PERMISSION_DELETE, async ({ transaction }) => {
    return PermissionCreationService.deletePermission(permissionId, { transaction });
  });
}

export async function updatePermission(PermissionId, PermissionData) {
  return withAuditEvent(AUDIT_EVENTS.PERMISSION_UPDATE, async ({ transaction }) => {
    return PermissionCreationService.updatePermission(PermissionId, PermissionData, { transaction });
  });
}
