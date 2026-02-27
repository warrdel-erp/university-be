import * as repository from '../repository/userRoleRepository.js';
import * as permissionRepository from '../repository/userPermissionRepository.js';
import { ROLES } from '../const/roles.js';
import * as model from '../models/index.js';

export async function assignRoleToUser(userId, role, permissions = []) {
    const transaction = await model.userRoleModel.sequelize.transaction();
    try {
        const validRoles = Object.values(ROLES);
        if (!validRoles.includes(role)) {
            throw new Error(`Invalid role: ${role}. Valid roles are ${validRoles.join(', ')}`);
        }

        const roleExists = await repository.checkUserRoleExists(userId, role);
        if (roleExists) {
            throw new Error(`User already has the role: ${role}`);
        }

        // If ADMIN, permissions are mandatory and we set them
        if (role === ROLES.ADMIN) {
            if (!permissions || permissions.length === 0) {
                throw new Error("Permissions are mandatory for ADMIN role");
            }
            await permissionRepository.setUserPermissions(userId, permissions, transaction);
        }

        // Add role
        const roleResult = await repository.addUserRole(userId, role, transaction);

        await transaction.commit();
        return roleResult;
    } catch (error) {
        await transaction.rollback();
        console.error("Service: Error in assignRoleToUser:", error);
        throw error;
    }
}

export async function removeRoleFromUser(userId, role) {
    const transaction = await model.userRoleModel.sequelize.transaction();
    try {
        const roleExists = await repository.checkUserRoleExists(userId, role);
        if (!roleExists) {
            throw new Error(`User does not have the role: ${role}`);
        }

        // Remove role
        await repository.removeUserRole(userId, role, transaction);

        // If removing ADMIN, also clear all permissions
        if (role === ROLES.ADMIN) {
            await permissionRepository.clearAllUserPermissions(userId, transaction);
        }

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        console.error("Service: Error in removeRoleFromUser:", error);
        throw error;
    }
}

export async function getUserRoles(userId) {
    try {
        return await repository.getUserRoles(userId);
    } catch (error) {
        console.error("Service: Error in getUserRoles:", error);
        throw error;
    }
}

export async function getUserAuthorization(userId) {
    try {
        const [roles, permissions] = await Promise.all([
            repository.getUserRoles(userId),
            permissionRepository.getUserPermissionsByUserId(userId)
        ]);
        return { roles, permissions };
    } catch (error) {
        console.error("Service: Error in getUserAuthorization:", error);
        throw error;
    }
}
