import * as repository from '../repository/userPermissionRepository.js';

export async function assignPermissionsToUser(userId, permissions) {
    try {
        if (!Array.isArray(permissions)) {
            throw new Error("Permissions must be an array of strings");
        }
        return await repository.clearAndSetUserPermissions(userId, permissions);
    } catch (error) {
        console.error("Service: Error in assignPermissionsToUser:", error);
        throw error;
    }
}

export async function getUserPermissions(userId) {
    try {
        return await repository.getUserPermissionsByUserId(userId);
    } catch (error) {
        console.error("Service: Error in getUserPermissions:", error);
        throw error;
    }
}
