import * as PermissionCreationService  from "../repository/permissionRepository.js";

export async function addPermission(PermissionData, createdBy, updatedBy) {

        // PermissionData.createdBy = createdBy;
        // PermissionData.updatedBy = updatedBy;
        const Permission = await PermissionCreationService.addPermission(PermissionData);
        return Permission;
};

export async function getPermissionDetails(universityId) {
    return await PermissionCreationService.getPermissionDetails(universityId);
}

export async function getSinglePermissionDetails(PermissionId,universityId) {
    return await PermissionCreationService.getSinglePermissionDetails(PermissionId,universityId);
}

export async function deletePermission(permissionId) {
    return await PermissionCreationService.deletePermission(permissionId);
}

export async function updatePermission(PermissionId, PermissionData, updatedBy) {    

    // PermissionData.updatedBy = updatedBy;
    await PermissionCreationService.updatePermission(PermissionId, PermissionData);
}