import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function clearAllUserPermissions(userId, transaction = null) {
    try {
        return await model.userPermissionModel.destroy({
            where: { userId },
            transaction
        });
    } catch (error) {
        console.error("Repository: Error in clearAllUserPermissions:", error);
        throw error;
    }
}

export async function setUserPermissions(userId, permissions, transaction = null) {
    try {
        const dataToInsert = permissions.map(perm => ({
            userId,
            permission: perm
        }));

        return await model.userPermissionModel.bulkCreate(dataToInsert, { transaction });
    } catch (error) {
        console.error("Repository: Error in setUserPermissions:", error);
        throw error;
    }
}

export async function clearAndSetUserPermissions(userId, permissions) {
    const transaction = await model.userPermissionModel.sequelize.transaction();
    try {
        await clearAllUserPermissions(userId, transaction);
        const result = await setUserPermissions(userId, permissions, transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        console.error("Error in clearAndSetUserPermissions :", error);
        throw error;
    }
}

export async function getUserPermissionsByUserId(userId) {
    try {
        const permissions = await model.userPermissionModel.findAll({
            where: { userId },
            attributes: ['permission']
        });
        return permissions.map(p => p.permission);
    } catch (error) {
        console.error("Error in getUserPermissionsByUserId :", error);
        throw error;
    }
}
