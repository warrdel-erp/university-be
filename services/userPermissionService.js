import * as repository from '../repository/userPermissionRepository.js';
import * as model from '../models/index.js';

export async function assignPermissionsToUser(userId, roleId, permissions) {
    try {
        if (!Array.isArray(permissions)) {
            throw new Error("Permissions must be an array of strings");
        }
        if (roleId) {
            const role = await model.roleModel.findOne({
                where: { roleId },
                attributes: ["roleId", "role", "code"]
            });
            if (role?.code) {
                const error = new Error(`Permissions for system-generated role '${role.role}' cannot be customized.`);
                error.statusCode = 403;
                throw error;
            }
        }
        return await repository.clearAndSetUserPermissions(userId, roleId, permissions);
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
