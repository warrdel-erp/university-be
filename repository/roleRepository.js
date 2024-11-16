import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addRole(RoleData) {    
    try {
        const result = await model.roleModel.create(RoleData);
        return result;
    } catch (error) {
        console.error("Error in add Role :", error);
        throw error;
    }
};

export async function getRoleDetails(universityId) {
    try {
        const Role = await model.roleModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        });

        return Role;
    } catch (error) {
        console.error('Error fetching Role details:', error);
        throw error;
    }
}


export async function getSingleRoleDetails(roleId) {
    try {
        const Role = await model.roleModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { roleId },
        });

        return Role;
    } catch (error) {
        console.error('Error fetching Role details:', error);
        throw error;
    }
}

export async function deleteRole(roleId) {
    const deleted = await model.roleModel.destroy({ where: { roleId: roleId } });
    return deleted > 0;
}

export async function updateRole(roleId, RoleData) {    
    try {
        const result = await model.roleModel.update(RoleData, {
            where: { roleId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Role creation ${roleId}:`, error);
        throw error; 
    }
}