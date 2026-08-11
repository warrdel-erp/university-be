import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import { SCOPES } from "../const/scopes.js";
import { expandPermissions } from "../utility/permissionUtility.js";

/**
 * Clear all permission entries for a user under a given role.
 * If no roleId given, clears ALL entries for the user.
 */
export async function clearAllUserPermissions(userId, roleId = null, transaction = null) {
  try {
    const where = { userId };
    if (roleId) where.roleId = roleId;

    return model.userRolePermissionModel.destroy({
      where,
      transaction,
    });
  } catch (error) {
    console.error("Repository: Error in clearAllUserPermissions:", error);
    throw error;
  }
}

/**
 * Saves permission+scope entries for a user under a given role.
 * Input supports:
 *   - Array of strings (permission keys, defaults to INSTITUTE scope)
 *   - Array of objects { permission, scope }
 *
 * @param {number} userId
 * @param {number} roleId
 * @param {Array} permissions
 * @param {object} transaction
 */
export async function setUserPermissions(userId, roleId, permissions, transaction = null) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
      transaction,
    });
    if (!user) {
      throw new Error("User not found");
    }

    const dataToInsert = [];
    for (const item of permissions) {
      if (typeof item === "string") {
        // Legacy: plain permission key, default to INSTITUTE scope
        dataToInsert.push({
          userId,
          roleId,
          permission: item,
          scope: SCOPES.INSTITUTE,
        });
      } else if (item && item.permission) {
        // New format: { permission, scope, resourceIds }
        let currentRoleId = roleId;
        if (item.permission === "perm_access_inst") {
          currentRoleId = null;
        } else if (!currentRoleId) {
          throw new Error(`roleId is required for permission ${item.permission}`);
        }

        let resourceIds = (item.resourceIds && item.resourceIds.length > 0) ? item.resourceIds : [null];
        resourceIds.forEach((resId) => {
          dataToInsert.push({
            userId,
            roleId: currentRoleId,
            permission: item.permission,
            scope: item.scope || SCOPES.INSTITUTE,
            resourceId: resId !== null && resId !== undefined && !isNaN(Number(resId)) ? Number(resId) : (resId || null),
          });
        });
      }
    }

    if (dataToInsert.length > 0) {
      return model.userRolePermissionModel.bulkCreate(dataToInsert, { transaction });
    }
    return [];
  } catch (error) {
    console.error("Repository: Error in setUserPermissions:", error);
    throw error;
  }
}

/**
 * Clear and re-set all user permission entries under a given role.
 */
export async function clearAndSetUserPermissions(userId, roleId, permissions) {
  const transaction = await model.userRolePermissionModel.sequelize.transaction();
  try {
    await clearAllUserPermissions(userId, roleId, transaction);

    // Also clear perm_access_inst for the user to avoid duplicates, as it's not bound by roleId anymore
    await model.userRolePermissionModel.destroy({
      where: { userId, permission: "perm_access_inst" },
      transaction
    });

    const result = await setUserPermissions(userId, roleId, permissions, transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in clearAndSetUserPermissions:", error);
    throw error;
  }
}

/**
 * Get all permission+scope entries for a user.
 * Optionally filter by roleId.
 */
export async function getUserPermissionsByUserId(userId, roleId = null) {
  try {
    const where = { userId };
    if (roleId) where.roleId = roleId;

    const entries = await model.userRolePermissionModel.findAll({
      where,
      include: [{ model: model.roleModel, as: "userRole", attributes: ["roleId", "role"] }],
    });

    const rawList = entries.map((e) => ({
      permission: e.permission,
      scope: e.scope,
      roleId: e.roleId,
      roleName: e.userRole?.role,
      resourceId: e.resourceId,
    }));

    return expandPermissions(rawList);
  } catch (error) {
    console.error("Error in getUserPermissionsByUserId:", error);
    throw error;
  }
}
