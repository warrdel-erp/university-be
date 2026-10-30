import * as repository from '../repository/userPermissionRepository.js';

export async function getUserPermissions(userId) {
    try {
        return await repository.getUserPermissionsByUserId(userId);
    } catch (error) {
        console.error("Service: Error in getUserPermissions:", error);
        throw error;
    }
}
