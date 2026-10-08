import * as RoleCreationService from "../repository/roleRepository.js";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";

export async function addRole(RoleData) {
  return RoleCreationService.addRole(RoleData);
}

export async function getRoleDetails() {
  return RoleCreationService.getRoleDetails();
}

export async function getSingleRoleDetails(roleId) {
  return RoleCreationService.getSingleRoleDetails(roleId);
}

export async function deleteRole(RoleSectionId) {
  return RoleCreationService.deleteRole(RoleSectionId);
}

export async function updateRole(roleId, RoleData) {
  return RoleCreationService.updateRole(roleId, RoleData);
}

/**
 * Get all permission+scope mappings for a role template.
 * Returns array of { rolePermissionsId, roleId, permission, scope }
 */
export async function getRolePermissions(roleId) {
  const mappings = await model.rolePermissionsModel.findAll({
    where: { role_id: roleId },
  });

  const permissionMap = {};
  mappings.forEach(m => {
    const key = `${m.permission}:${m.scope}`;
    if (!permissionMap[key]) {
      permissionMap[key] = {
        rolePermissionsId: m.rolePermissionsId,
        roleId: m.roleId,
        permission: m.permission,
        scope: m.scope,
        resourceIds: []
      };
    }
    if (m.resourceId) {
      permissionMap[key].resourceIds.push(m.resourceId);
    }
  });

  return Object.values(permissionMap);
}

/**
 * Save role template permission+scope mappings.
 * Replaces all existing mappings for this role.
 * @param {number} roleId 
 * @param {Array<{permission: string, scope: string}>} permissions 
 */
export async function assignRolePermissions(roleId, permissions, transaction = null) {
  const internalTransaction = !transaction ? await sequelize.transaction() : null;
  const activeTransaction = transaction || internalTransaction;

  try {
    // Fetch the role
    const roleRecord = await model.roleModel.findOne({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    await model.rolePermissionsModel.destroy({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    const dataToInsert = [];
    permissions.forEach(p => {
      let resourceIds = (p.resourceIds && p.resourceIds.length > 0) ? p.resourceIds : [null];
      
      // Default null for resourceIds if not provided
      if (resourceIds[0] === null) {
        // Now that roles aren't institute-wise, it remains null unless explicitly provided
      }

      resourceIds.forEach(resId => {
        dataToInsert.push({
          roleId,
          permission: p.permission,
          scope: p.scope,
          resourceId: resId
        });
      });
    });

    const result = await model.rolePermissionsModel.bulkCreate(dataToInsert, {
      transaction: activeTransaction
    });

    // SYNC WITH ASSIGNED USERS
    // 1. Find all users who currently have this role
    const usersWithRole = await model.userRolePermissionModel.findAll({
      attributes: ['userId'],
      where: { roleId },
      group: ['userId'],
      transaction: activeTransaction
    });

    const userIds = usersWithRole.map(u => u.userId);

    if (userIds.length > 0) {
      // 2. Delete all existing user permissions for this role
      await model.userRolePermissionModel.destroy({
        where: { roleId },
        transaction: activeTransaction
      });

      // 3. Insert new user permissions for all these users
      const userPermissionsToInsert = [];
      userIds.forEach(userId => {
        dataToInsert.forEach(dp => {
          if (dp.permission !== "perm_access_inst") {
            userPermissionsToInsert.push({
              userId,
              roleId,
              permission: dp.permission,
              scope: dp.scope,
              resourceId: dp.resourceId
            });
          }
        });
      });

      if (userPermissionsToInsert.length > 0) {
        await model.userRolePermissionModel.bulkCreate(userPermissionsToInsert, {
          transaction: activeTransaction
        });
      }
    }

    if (internalTransaction) await internalTransaction.commit();
    return result;
  } catch (error) {
    if (internalTransaction) await internalTransaction.rollback();
    throw error;
  }
}
