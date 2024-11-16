import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addPermission(PermissionData) {    
    try {
        const result = await model.permissionModel.create(PermissionData);
        return result;
    } catch (error) {
        console.error("Error in add Permission :", error);
        throw error;
    }
};

export async function getPermissionDetails(universityId) {
    try {
        const Permission = await model.permissionModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        });

        return Permission;
    } catch (error) {
        console.error('Error fetching Permission details:', error);
        throw error;
    }
}


export async function getSinglePermissionDetails(permissionId) {
    try {
        const Permission = await model.permissionModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { permissionId },
        });

        return Permission;
    } catch (error) {
        console.error('Error fetching Permission details:', error);
        throw error;
    }
}

export async function deletePermission(permissionId) {
    const deleted = await model.permissionModel.destroy({ where: { permissionId: permissionId } });
    return deleted > 0;
}

export async function updatePermission(permissionId, PermissionData) {    
    try {
        const result = await model.permissionModel.update(PermissionData, {
            where: { permissionId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Permission creation ${PermissionId}:`, error);
        throw error; 
    }
}