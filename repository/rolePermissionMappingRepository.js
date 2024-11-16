import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addRolePermissionMapping(RolePermissionMappingData) { 
    try {
        const result = await model.rolePermissionMappingModel.create(RolePermissionMappingData);
        return result;
    } catch (error) {
        console.error("Error in add RolePermissionMapping :", error);
        throw error;
    }
};

export async function getRolePermissionMappingDetails(universityId) {
    try {
        const RolePermissionMapping = await model.rolePermissionMappingModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","role_id","permission_id"] },
            include:[
                {
                    model:model.roleModel,
                    as: 'userMapped',
                    attributes: ["role"],
                },
                {
                    model:model.permissionModel,
                    as: 'permissionMapped',
                    attributes: ["permission"],
                }
            ]
        });

        return RolePermissionMapping;
    } catch (error) {
        console.error('Error fetching RolePermissionMapping details:', error);
        throw error;
    }
}


export async function getSingleRolePermissionMappingDetails(rolePermissionMappingId) {
    try {
        const RolePermissionMapping = await model.rolePermissionMappingModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","role_id","permission_id"] },
            include:[
                {
                    model:model.roleModel,
                    as: 'userMapped',
                    attributes: ["role"],
                },
                {
                    model:model.permissionModel,
                    as: 'permissionMapped',
                    attributes: ["permission"],
                }
            ],
             where: { rolePermissionMappingId },
        });

        return RolePermissionMapping;
    } catch (error) {
        console.error('Error fetching RolePermissionMapping details:', error);
        throw error;
    }
}

export async function deleteRolePermissionMapping(rolePermissionMappingId) {
    const deleted = await model.rolePermissionMappingModel.destroy({ where: { rolePermissionMappingId: rolePermissionMappingId } });
    return deleted > 0;
}

export async function updateRolePermissionMapping(rolePermissionMappingId, RolePermissionMappingData) {    
    try {
        const result = await model.rolePermissionMappingModel.update(RolePermissionMappingData, {
            where: { rolePermissionMappingId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating RolePermissionMapping creation ${rolePermissionMappingId}:`, error);
        throw error; 
    }
}

export async function getPermissionByRole(roleId) {
    try {
        const RolePermission = await model.rolePermissionMappingModel.findAll({
            attributes: ["role_id","permission_id"] ,
            where: { roleId },
        });

        return RolePermission;
    } catch (error) {
        console.error('Error fetching RolePermission details:', error);
        throw error;
    }
};