import * as UserRolePermissionCreationService from "../repository/userRolePermissionRepository.js";

export async function addUserRolePermission(UserRolePermissionData) {
  const roleId = UserRolePermissionData.roleId;
  const permissionData = UserRolePermissionData.permission || UserRolePermissionData.permissionId;
  const userId = UserRolePermissionData.userId;
  const scope = UserRolePermissionData.scope ?? null;
  const resourceId = UserRolePermissionData.resourceId ?? null;
  const universityId = UserRolePermissionData.universityId ?? null;

  if (Array.isArray(permissionData)) {
    const mappings = permissionData.map((perm) => ({
      roleId,
      permission: perm,
      userId,
      scope,
      resourceId,
      universityId,
    }));

    return Promise.all(
      mappings.map((mapping) => UserRolePermissionCreationService.addUserRolePermission(mapping))
    );
  }

  return UserRolePermissionCreationService.addUserRolePermission({
    roleId,
    permission: permissionData,
    userId,
    scope,
    resourceId,
    universityId,
  });
}

export async function getUserRolePermissionDetails() {
  return UserRolePermissionCreationService.getUserRolePermissionDetails();
}

export async function getSingleUserRolePermissionDetails(userRolePermissionId) {
  return UserRolePermissionCreationService.getSingleUserRolePermissionDetails(userRolePermissionId);
}

export async function deleteUserRolePermission(userRolePermissionId) {
  return UserRolePermissionCreationService.deleteUserRolePermission(userRolePermissionId);
}

export async function updateUserRolePermission(userRolePermissionId, UserRolePermissionData) {
  return UserRolePermissionCreationService.updateUserRolePermission(
    userRolePermissionId,
    UserRolePermissionData
  );
}
