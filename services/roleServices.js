import * as RoleCreationService from "../repository/roleRepository.js";

export async function addRole(RoleData) {
  return RoleCreationService.addRole(RoleData);
}

export async function getRoleDetails() {
  return RoleCreationService.getRoleDetails();
}

export async function getSingleRoleDetails(roleId) {
  return RoleCreationService.getSingleRoleDetails(roleId);
}

export async function deleteRole(RoleSectionId) {
  return RoleCreationService.deleteRole(RoleSectionId);
}

export async function updateRole(roleId, RoleData) {
  return RoleCreationService.updateRole(roleId, RoleData);
}
