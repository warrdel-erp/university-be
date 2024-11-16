import * as RoleCreationService  from "../repository/RoleRepository.js";

export async function addRole(RoleData, createdBy, updatedBy) {

        // RoleData.createdBy = createdBy;
        // RoleData.updatedBy = updatedBy;
        const Role = await RoleCreationService.addRole(RoleData);
        return Role;
};

export async function getRoleDetails(universityId) {
    return await RoleCreationService.getRoleDetails(universityId);
}

export async function getSingleRoleDetails(roleId,universityId) {
    return await RoleCreationService.getSingleRoleDetails(roleId,universityId);
}

export async function deleteRole(RoleSectionId) {
    return await RoleCreationService.deleteRole(RoleSectionId);
}

export async function updateRole(roleId, RoleData, updatedBy) {    

    // RoleData.updatedBy = updatedBy;
    await RoleCreationService.updateRole(roleId, RoleData);
}