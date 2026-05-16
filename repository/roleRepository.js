import * as model from '../models/index.js'
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';

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

/** Avoid string compare in SQL (role column may be latin1). */
export async function findStudentRoleId() {
    const roles = await model.roleModel.findAll({
        attributes: ["roleId", "role"],
    });
    for (const row of roles) {
        const plain = typeof row.get === "function" ? row.get({ plain: true }) : row;
        const name = String(plain.role ?? "").trim().toUpperCase();
        if (name === "STUDENT") return plain.roleId;
    }
    return null;
}

/** Legacy latin1-safe lookup when SQL string compare is required. */
export async function findRoleByRoleName(roleName) {
    const rows = await sequelize.query(
        `SELECT role_id AS roleId, role
         FROM role
         WHERE role = CONVERT(:roleName USING latin1)
           AND deleted_at IS NULL
         LIMIT 1`,
        { replacements: { roleName }, type: QueryTypes.SELECT }
    );
    return rows[0] ?? null;
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