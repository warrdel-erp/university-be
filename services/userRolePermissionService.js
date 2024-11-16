import * as UserRolePermissionCreationService  from "../repository/userRolePermissionRepository.js";

export async function addUserRolePermission(UserRolePermissionData, createdBy, updatedBy) {

    const roleId = UserRolePermissionData.roleId;
    const permissionIds = UserRolePermissionData.permissionId;
    const userId = UserRolePermissionData.userId;

    const mappings = permissionIds.map(permissionId => ({
        roleId: roleId,
        permissionId: permissionId,
        userId:userId,
        // createdBy: createdBy,
        // updatedBy: updatedBy,
    }));

    const results = await Promise.all(mappings.map(mapping => 
        UserRolePermissionCreationService.addUserRolePermission(mapping)
    ));

    return results;
}

export async function getUserRolePermissionDetails(universityId) {
    return await UserRolePermissionCreationService.getUserRolePermissionDetails(universityId);
}

export async function getSingleUserRolePermissionDetails(userRolePermissionId,universityId) {
    return await UserRolePermissionCreationService.getSingleUserRolePermissionDetails(userRolePermissionId,universityId);
}

export async function deleteUserRolePermission(userRolePermissionId) {
    return await UserRolePermissionCreationService.deleteUserRolePermission(userRolePermissionId);
}

export async function updateUserRolePermission(userRolePermissionId, UserRolePermissionData, updatedBy) {    

    // UserRolePermissionData.updatedBy = updatedBy;
    await UserRolePermissionCreationService.updateUserRolePermission(userRolePermissionId, UserRolePermissionData);
}