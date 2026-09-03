import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import sequelize from "../database/sequelizeConfig.js";

/**
 * Assign a role to a user by copying all role_permissions template rows
 * into user_role_permission_scope for this user.
 */
export async function addUserRole(userId, roleId, transaction = null) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
      transaction,
    });
    if (!user) {
      throw new Error("User not found");
    }

    const role = await model.roleModel.findOne({
      where: { roleId },
      transaction,
    });
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    // Fetch the role template defaults
    const templatePermissions = await model.rolePermissionMappingModel.findAll({
      where: { roleId: role.roleId },
      transaction,
    });

    // Copy template entries into user_role_permission_scope
    const dataToInsert = [];
    templatePermissions.forEach((tp) => {
      if (tp.permission !== "perm_access_inst") {
        dataToInsert.push({
          userId,
          roleId: role.roleId,
          permission: tp.permission,
          scope: tp.scope,
          resourceId: tp.resourceId
        });
      }
    });

    // Implicitly grant base access context based on the role's association
    if (role.instituteId) {
      const existingBaseAccess = await model.userRolePermissionModel.count({
        where: { userId, permission: "perm_access_inst", resourceId: role.instituteId },
        transaction
      });
      if (existingBaseAccess === 0) {
        dataToInsert.push({
          userId,
          roleId: null,
          permission: "perm_access_inst",
          scope: "INSTITUTE",
          resourceId: role.instituteId
        });
      }
    }

    if (dataToInsert.length > 0) {
      await model.userRolePermissionModel.bulkCreate(dataToInsert, { transaction });
    }

    return { userId, roleId: role.roleId, roleName: role.role, permissionsAssigned: dataToInsert.length };
  } catch (error) {
    console.error("Repository: Error in addUserRole:", error);
    throw error;
  }
}

/**
 * Remove a role from a user by deleting all entries in user_role_permission_scope
 * for this user + role combination.
 */
export async function removeUserRole(userId, roleId, transaction = null) {
  try {
    const role = await model.roleModel.findOne({
      where: { roleId },
      transaction,
    });
    if (!role) {
      return 0;
    }

    return model.userRolePermissionModel.destroy({
      where: { userId, roleId: role.roleId },
      transaction,
    });
  } catch (error) {
    console.error("Repository: Error in removeUserRole:", error);
    throw error;
  }
}

/**
 * Get all distinct roles assigned to a user.
 * Derived from user_role_permission_scope via DISTINCT roleId.
 */
export async function getUserRoles(userId) {
  try {
    const entries = await model.userRolePermissionModel.findAll({
      where: { userId },
      include: [{ model: model.roleModel, as: "userRole", attributes: ["roleId", "role"] }],
      raw: false,
    });

    // Extract unique roles in memory to avoid DISTINCT SQL conflicts with 'include'
    const rolesMap = new Map();
    entries.forEach((e) => {
      if (e.userRole) {
        rolesMap.set(e.userRole.roleId, e.userRole.role);
      }
    });
    return Array.from(rolesMap.entries()).map(([roleId, roleName]) => ({ roleId, roleName }));
  } catch (error) {
    console.error("Repository: Error in getUserRoles:", error);
    throw error;
  }
}

export async function findDistinctRolesByUserIds(userIds) {
  if (!userIds.length) {
    return new Map();
  }

  const entries = await model.userRolePermissionModel.findAll({
    where: { userId: { [Op.in]: userIds } },
    attributes: ["userId"],
    include: [
      {
        model: model.roleModel,
        as: "userRole",
        attributes: ["roleId", "role"],
        required: true,
      },
    ],
  });

  const rolesByUserId = new Map();
  for (const entry of entries) {
    if (!entry.userRole) {
      continue;
    }

    if (!rolesByUserId.has(entry.userId)) {
      rolesByUserId.set(entry.userId, new Map());
    }

    const userRoles = rolesByUserId.get(entry.userId);
    userRoles.set(entry.userRole.roleId, {
      roleId: entry.userRole.roleId,
      roleName: entry.userRole.role,
    });
  }

  const result = new Map();
  for (const [userId, userRoles] of rolesByUserId) {
    result.set(userId, Array.from(userRoles.values()));
  }

  return result;
}

/**
 * Check if user already has a specific role assigned.
 */
export async function checkUserRoleExists(userId, roleId) {
  try {
    const role = await model.roleModel.findOne({
      where: isNaN(Number(roleId)) ? { role: roleId } : { roleId },
    });
    if (!role) {
      return false;
    }

    const count = await model.userRolePermissionModel.count({
      where: { userId, roleId: role.roleId },
    });
    return count > 0;
  } catch (error) {
    console.error("Repository: Error in checkUserRoleExists:", error);
    throw error;
  }
}
