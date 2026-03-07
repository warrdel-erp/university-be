import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addUserRole(userId, role, transaction = null) {
    try {
        return await model.userRoleModel.create({
            userId,
            role
        }, { transaction });
    } catch (error) {
        console.error("Repository: Error in addUserRole:", error);
        throw error;
    }
}

export async function removeUserRole(userId, role, transaction = null) {
    try {
        return await model.userRoleModel.destroy({
            where: {
                userId,
                role
            },
            transaction
        });
    } catch (error) {
        console.error("Repository: Error in removeUserRole:", error);
        throw error;
    }
}

export async function getUserRoles(userId) {
    try {
        const roles = await model.userRoleModel.findAll({
            where: { userId },
            attributes: ['role']
        });
        return roles.map(r => r.role);
    } catch (error) {
        console.error("Repository: Error in getUserRoles:", error);
        throw error;
    }
}

export async function checkUserRoleExists(userId, role) {
    try {
        const count = await model.userRoleModel.count({
            where: {
                userId,
                role
            }
        });
        return count > 0;
    } catch (error) {
        console.error("Repository: Error in checkUserRoleExists:", error);
        throw error;
    }
}
