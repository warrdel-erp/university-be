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
 * Returns array of { rolePermissionsId, roleId, permission, scope, resourceIds }
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
 * Accepts pure permissions list, and retains existing base-scope resourceIds if already configured.
 * @param {number} roleId 
 * @param {Array<{permission: string, scope?: string, resourceIds?: number[]}>} permissions 
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

    if (!roleRecord) {
      throw new Error(`Role not found: ${roleId}`);
    }

    if (roleRecord?.code) {
      throw new Error(`Permissions for system-generated role '${roleRecord.role}' cannot be modified.`);
    }

    // Check if role already has existing base-scope resourceIds configured
    const existingMappings = await model.rolePermissionsModel.findAll({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    const existingResourceIds = [
      ...new Set(
        existingMappings
          .map(m => m.resourceId)
          .filter(id => id !== null && id !== undefined)
      )
    ];
    const existingScope = existingMappings.find(m => m.permission === "perm_access_inst")?.scope || null;
    const hasExistingAccessInst = existingMappings.some(m => m.permission === "perm_access_inst");

    await model.rolePermissionsModel.destroy({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    const dataToInsert = [];
    permissions.forEach(p => {
      // Use explicitly provided resourceIds, or fallback to existing base-scope resourceIds if available
      let resourceIds = (p.resourceIds && p.resourceIds.length > 0)
        ? p.resourceIds
        : (existingResourceIds.length > 0 ? existingResourceIds : [null]);

      resourceIds.forEach(resId => {
        dataToInsert.push({
          roleId: Number(roleId),
          permission: p.permission,
          scope: p.scope || existingScope || "INSTITUTE",
          resourceId: resId
        });
      });
    });

    // Retain perm_access_inst if it already existed and wasn't sent in the new permissions array
    if (hasExistingAccessInst && !permissions.some(p => p.permission === "perm_access_inst")) {
      const resIds = existingResourceIds.length > 0 ? existingResourceIds : [null];
      resIds.forEach(resId => {
        dataToInsert.push({
          roleId: Number(roleId),
          permission: "perm_access_inst",
          scope: existingScope || "INSTITUTE",
          resourceId: resId
        });
      });
    }

    const result = await model.rolePermissionsModel.bulkCreate(dataToInsert, {
      transaction: activeTransaction
    });

    // SYNC WITH ASSIGNED USERS
    // 1. Find all users who currently have this role
    const usersWithRole = await model.userRolePermissionModel.findAll({
      attributes: ['userId', 'universityId'],
      where: { roleId },
      group: ['userId', 'universityId'],
      transaction: activeTransaction
    });

    const userUnivMap = {};
    usersWithRole.forEach(u => {
      userUnivMap[u.userId] = u.universityId;
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
              roleId: Number(roleId),
              permission: dp.permission,
              scope: dp.scope || null,
              resourceId: dp.resourceId,
              universityId: userUnivMap[userId] || roleRecord.universityId || null,
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

/**
 * Get current Base Scope configuration for a role (University -> Campus -> Institute selection).
 * @param {number} roleId
 */
export async function getRoleBaseScope(roleId) {
  const rows = await model.rolePermissionsModel.findAll({
    where: { role_id: roleId },
  });

  if (!rows || rows.length === 0) {
    return { roleId: Number(roleId), scope: null, resourceIds: [] };
  }

  const accessInstRows = rows.filter(r => r.permission === "perm_access_inst");
  const targetRows = accessInstRows.length > 0 ? accessInstRows : rows;

  const scope = targetRows[0]?.scope || null;
  const resourceIds = [
    ...new Set(
      targetRows
        .map(r => r.resourceId)
        .filter(id => id !== null && id !== undefined)
    )
  ];

  return {
    roleId: Number(roleId),
    scope,
    resourceIds
  };
}

/**
 * Assign / Update Base Scope (University / Campus / Institute resourceIds) for a role.
 * Replicates all role permissions across the selected resourceIds and syncs with users.
 * 
 * @param {number} roleId 
 * @param {{ scope: string, resourceIds?: number[], selectedNodes?: number[] }} baseScopeData 
 * @param {object|null} transaction 
 */
export async function assignRoleBaseScope(roleId, baseScopeData, transaction = null) {
  const internalTransaction = !transaction ? await sequelize.transaction() : null;
  const activeTransaction = transaction || internalTransaction;

  try {
    const roleRecord = await model.roleModel.findOne({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    if (!roleRecord) {
      throw new Error(`Role not found: ${roleId}`);
    }

    // System roles (like CLIENT_ADMIN) CAN have their structural scope (Institutes) configured/extended!
    // We only replicate their permissions across the chosen institutes without modifying the permission types themselves.

    const scope = baseScopeData.scope || "INSTITUTE";
    const rawNodes = baseScopeData.resourceIds ?? baseScopeData.selectedNodes ?? [];
    const resourceIds = Array.isArray(rawNodes) && rawNodes.length > 0
      ? rawNodes.map(Number).filter(n => !isNaN(n))
      : [null];

    // 1. Fetch current distinct permissions for this role
    const currentMappings = await model.rolePermissionsModel.findAll({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    const permissionMap = new Map();
    currentMappings.forEach(m => {
      if (!permissionMap.has(m.permission)) {
        permissionMap.set(m.permission, m.scope || scope);
      }
    });

    // Ensure base institute access permission is included
    if (!permissionMap.has("perm_access_inst")) {
      permissionMap.set("perm_access_inst", scope);
    }

    // 2. Remove all old role_permissions for this role
    await model.rolePermissionsModel.destroy({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    // 3. Re-insert permissions replicated for each resourceId
    const dataToInsert = [];
    for (const [permKey, permScope] of permissionMap.entries()) {
      if (permScope === "UNIVERSITY" && permKey !== "perm_access_inst") {
        // Keep inherently university-wide permissions at university scope
        dataToInsert.push({
          roleId: Number(roleId),
          permission: permKey,
          scope: "UNIVERSITY",
          resourceId: roleRecord.universityId || null
        });
      } else {
        const effectiveScope = (permKey === "perm_access_inst") ? scope : (permScope || scope);
        resourceIds.forEach(resId => {
          dataToInsert.push({
            roleId: Number(roleId),
            permission: permKey,
            scope: effectiveScope,
            resourceId: resId
          });
        });
      }
    }

    const result = await model.rolePermissionsModel.bulkCreate(dataToInsert, {
      transaction: activeTransaction
    });

    // 4. SYNC WITH ASSIGNED USERS in user_role_permission_scope
    const usersWithRole = await model.userRolePermissionModel.findAll({
      attributes: ['userId', 'universityId'],
      where: { roleId },
      group: ['userId', 'universityId'],
      transaction: activeTransaction
    });

    const userUnivMap = {};
    usersWithRole.forEach(u => {
      userUnivMap[u.userId] = u.universityId;
    });

    const userIds = usersWithRole.map(u => u.userId);

    if (userIds.length > 0) {
      await model.userRolePermissionModel.destroy({
        where: { roleId },
        transaction: activeTransaction
      });

      const userPermissionsToInsert = [];
      userIds.forEach(userId => {
        dataToInsert.forEach(dp => {
          userPermissionsToInsert.push({
            userId,
            roleId: Number(roleId),
            permission: dp.permission,
            scope: dp.scope || scope,
            resourceId: dp.resourceId,
            universityId: userUnivMap[userId] || roleRecord.universityId || null,
          });
        });
      });

      if (userPermissionsToInsert.length > 0) {
        await model.userRolePermissionModel.bulkCreate(userPermissionsToInsert, {
          transaction: activeTransaction
        });
      }
    }

    if (internalTransaction) await internalTransaction.commit();
    return {
      roleId: Number(roleId),
      roleName: roleRecord.role,
      scope,
      resourceIds: resourceIds.filter(id => id !== null),
      totalPermissionsReplicated: permissionMap.size,
      totalRowsInserted: result.length
    };
  } catch (error) {
    if (internalTransaction) await internalTransaction.rollback();
    throw error;
  }
}
