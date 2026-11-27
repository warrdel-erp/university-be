import * as RolePermissionsCreationService from "../repository/rolePermissionsRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addRolePermissions(RolePermissionsData) {
  return withAuditEvent(AUDIT_EVENTS.ROLE_PERMISSION_CREATE, async ({ transaction }) => {
    const roleId = RolePermissionsData.roleId;
    const permissionIds = RolePermissionsData.permissionId;

    const mappings = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));

    return Promise.all(
      mappings.map((mapping) => RolePermissionsCreationService.addRolePermissions(mapping, { transaction }))
    );
  });
}

export async function getRolePermissionsDetails() {
  return RolePermissionsCreationService.getRolePermissionsDetails();
}

export async function getSingleRolePermissionsDetails(rolePermissionsId) {
  return RolePermissionsCreationService.getSingleRolePermissionsDetails(rolePermissionsId);
}

export async function deleteRolePermissions(rolePermissionsId) {
  return withAuditEvent(AUDIT_EVENTS.ROLE_PERMISSION_DELETE, async ({ transaction }) => {
    return RolePermissionsCreationService.deleteRolePermissions(rolePermissionsId, { transaction });
  });
}

export async function updateRolePermissions(rolePermissionsId, RolePermissionsData) {
  return withAuditEvent(AUDIT_EVENTS.ROLE_PERMISSION_UPDATE, async ({ transaction }) => {
    return RolePermissionsCreationService.updateRolePermissions(
      rolePermissionsId,
      RolePermissionsData,
      { transaction }
    );
  });
}
