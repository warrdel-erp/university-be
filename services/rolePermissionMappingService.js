import * as RolePermissionMappingCreationService  from "../repository/rolePermissionMappingRepository.js";

export async function addRolePermissionMapping(RolePermissionMappingData, createdBy, updatedBy) {

    const roleId = RolePermissionMappingData.roleId;
    const permissionIds = RolePermissionMappingData.permissionId;

    const mappings = permissionIds.map(permissionId => ({
        roleId: roleId,
        permissionId: permissionId,
        // createdBy: createdBy,
        // updatedBy: updatedBy,
    }));

    const results = await Promise.all(mappings.map(mapping => 
        RolePermissionMappingCreationService.addRolePermissionMapping(mapping)
    ));

    return results;
}


export async function getRolePermissionMappingDetails(universityId) {
    return await RolePermissionMappingCreationService.getRolePermissionMappingDetails(universityId);
}

export async function getSingleRolePermissionMappingDetails(rolePermissionMappingId,universityId) {
    return await RolePermissionMappingCreationService.getSingleRolePermissionMappingDetails(rolePermissionMappingId,universityId);
}

export async function deleteRolePermissionMapping(rolePermissionMappingId) {
    return await RolePermissionMappingCreationService.deleteRolePermissionMapping(rolePermissionMappingId);
}

export async function updateRolePermissionMapping(rolePermissionMappingId, RolePermissionMappingData, updatedBy) {    

    // RolePermissionMappingData.updatedBy = updatedBy;
    await RolePermissionMappingCreationService.updateRolePermissionMapping(rolePermissionMappingId, RolePermissionMappingData);
}