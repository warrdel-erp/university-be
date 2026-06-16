import * as PermissionCreationService from "../repository/permissionRepository.js";

export async function addPermission(PermissionData) {
  return PermissionCreationService.addPermission(PermissionData);
}

export async function getPermissionDetails() {
  return PermissionCreationService.getPermissionDetails();
}

export async function getSinglePermissionDetails(PermissionId) {
  return PermissionCreationService.getSinglePermissionDetails(PermissionId);
}

export async function deletePermission(permissionId) {
  return PermissionCreationService.deletePermission(permissionId);
}

export async function updatePermission(PermissionId, PermissionData) {
  return PermissionCreationService.updatePermission(PermissionId, PermissionData);
}
