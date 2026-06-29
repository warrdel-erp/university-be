import * as RolePermissionMappingCreationService from "../repository/rolePermissionMappingRepository.js";

export async function addRolePermissionMapping(RolePermissionMappingData) {
  const roleId = RolePermissionMappingData.roleId;
  const permissionIds = RolePermissionMappingData.permissionId;

  const mappings = permissionIds.map((permissionId) => ({
    roleId,
    permissionId,
  }));

  return Promise.all(
    mappings.map((mapping) => RolePermissionMappingCreationService.addRolePermissionMapping(mapping))
  );
}

export async function getRolePermissionMappingDetails() {
  return RolePermissionMappingCreationService.getRolePermissionMappingDetails();
}

export async function getSingleRolePermissionMappingDetails(rolePermissionMappingId) {
  return RolePermissionMappingCreationService.getSingleRolePermissionMappingDetails(rolePermissionMappingId);
}

export async function deleteRolePermissionMapping(rolePermissionMappingId) {
  return RolePermissionMappingCreationService.deleteRolePermissionMapping(rolePermissionMappingId);
}

export async function updateRolePermissionMapping(rolePermissionMappingId, RolePermissionMappingData) {
  return RolePermissionMappingCreationService.updateRolePermissionMapping(
    rolePermissionMappingId,
    RolePermissionMappingData
  );
}
