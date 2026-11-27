import * as UserRolePermissionCreationService from "../repository/userRolePermissionRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addUserRolePermission(UserRolePermissionData) {
  return withAuditEvent(AUDIT_EVENTS.USER_ROLE_PERMISSION_CREATE, async ({ transaction }) => {
    const { roleId, userId, universityId = null } = UserRolePermissionData;

    return UserRolePermissionCreationService.addUserRolePermission({
      roleId,
      userId,
      universityId,
    }, { transaction });
  });
}

export async function getUserRolePermissionDetails() {
  return UserRolePermissionCreationService.getUserRolePermissionDetails();
}

export async function getSingleUserRolePermissionDetails(userRolePermissionId) {
  return UserRolePermissionCreationService.getSingleUserRolePermissionDetails(userRolePermissionId);
}

export async function deleteUserRolePermission(userRolePermissionId) {
  return withAuditEvent(AUDIT_EVENTS.USER_ROLE_PERMISSION_DELETE, async ({ transaction }) => {
    return UserRolePermissionCreationService.deleteUserRolePermission(userRolePermissionId, { transaction });
  });
}

export async function updateUserRolePermission(userRolePermissionId, UserRolePermissionData) {
  return withAuditEvent(AUDIT_EVENTS.USER_ROLE_PERMISSION_UPDATE, async ({ transaction }) => {
    return UserRolePermissionCreationService.updateUserRolePermission(
      userRolePermissionId,
      UserRolePermissionData,
      { transaction }
    );
  });
}
