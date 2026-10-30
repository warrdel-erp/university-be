import * as UserRolePermissionCreationService from "../repository/userRolePermissionRepository.js";

export async function addUserRolePermission(UserRolePermissionData) {
  const { roleId, userId, universityId = null } = UserRolePermissionData;

  return UserRolePermissionCreationService.addUserRolePermission({
    roleId,
    userId,
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
