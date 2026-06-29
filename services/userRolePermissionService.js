import * as UserRolePermissionCreationService from "../repository/userRolePermissionRepository.js";

export async function addUserRolePermission(UserRolePermissionData) {
  const roleId = UserRolePermissionData.roleId;
  const permissionIds = UserRolePermissionData.permissionId;
  const userId = UserRolePermissionData.userId;

  const mappings = permissionIds.map((permissionId) => ({
    roleId,
    permissionId,
    userId,
  }));

  return Promise.all(
    mappings.map((mapping) => UserRolePermissionCreationService.addUserRolePermission(mapping))
  );
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
