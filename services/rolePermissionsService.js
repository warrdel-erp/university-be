import * as RolePermissionsCreationService from "../repository/rolePermissionsRepository.js";

export async function addRolePermissions(RolePermissionsData) {
  const roleId = RolePermissionsData.roleId;
  const permissionIds = RolePermissionsData.permissionId;

  const mappings = permissionIds.map((permissionId) => ({
    roleId,
    permissionId,
  }));

  return Promise.all(
    mappings.map((mapping) => RolePermissionsCreationService.addRolePermissions(mapping))
  );
}

export async function getRolePermissionsDetails() {
  return RolePermissionsCreationService.getRolePermissionsDetails();
}

export async function getSingleRolePermissionsDetails(rolePermissionsId) {
  return RolePermissionsCreationService.getSingleRolePermissionsDetails(rolePermissionsId);
}

export async function deleteRolePermissions(rolePermissionsId) {
  return RolePermissionsCreationService.deleteRolePermissions(rolePermissionsId);
}

export async function updateRolePermissions(rolePermissionsId, RolePermissionsData) {
  return RolePermissionsCreationService.updateRolePermissions(
    rolePermissionsId,
    RolePermissionsData
  );
}
