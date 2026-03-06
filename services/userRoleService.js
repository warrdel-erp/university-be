import * as repository from '../repository/userRoleRepository.js';
import * as permissionRepository from '../repository/userPermissionRepository.js';
import { ROLES } from '../const/roles.js';
import * as model from '../models/index.js';
import sequelize from '../database/sequelizeConfig.js';

export async function assignRoleToUser(userId, role, permissions = [], transaction = null) {
    const internalTransaction = !transaction ? await sequelize.transaction() : null;
    const activeTransaction = transaction || internalTransaction;
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
            await permissionRepository.setUserPermissions(userId, permissions, activeTransaction);
        }

        // Add role
        const roleResult = await repository.addUserRole(userId, role, activeTransaction);

        if (internalTransaction) await internalTransaction.commit();
        return roleResult;
    } catch (error) {
        if (internalTransaction) await internalTransaction.rollback();
        console.error("Service: Error in assignRoleToUser:", error);
        throw error;
    }
}

export async function removeRoleFromUser(userId, role, transaction = null) {
    const internalTransaction = !transaction ? await sequelize.transaction() : null;
    const activeTransaction = transaction || internalTransaction;
    try {
        const roleExists = await repository.checkUserRoleExists(userId, role);
        if (!roleExists) {
            throw new Error(`User does not have the role: ${role}`);
        }

        // Remove role
        await repository.removeUserRole(userId, role, activeTransaction);

        // If removing ADMIN, also clear all permissions
        if (role === ROLES.ADMIN) {
            await permissionRepository.clearAllUserPermissions(userId, activeTransaction);
        }

        if (internalTransaction) await internalTransaction.commit();
        return true;
    } catch (error) {
        if (internalTransaction) await internalTransaction.rollback();
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
