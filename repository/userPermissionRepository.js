import * as model from "../models/index.js";
import { expandPermissions } from "../utility/permissionUtility.js";

/**
 * Get all permission+scope entries for a user.
 * A user has no permissions of their own: they come from the roles
 * the user holds. Optionally filter by roleId.
 */
export async function getUserPermissionsByUserId(userId, roleId = null) {
  try {
    const where = { userId };
    if (roleId) where.roleId = roleId;

    const userRoles = await model.userRolePermissionModel.findAll({
      where,
      attributes: ["roleId"],
      include: [{ model: model.roleModel, as: "userRole", attributes: ["roleId", "role"] }],
    });

    if (userRoles.length === 0) {
      return [];
    }

    const roleNames = new Map(userRoles.map((ur) => [ur.roleId, ur.userRole?.role]));

    const entries = await model.rolePermissionsModel.findAll({
      where: { roleId: [...roleNames.keys()] },
    });

    const rawList = entries.map((e) => ({
      permission: e.permission,
      scope: e.scope,
      roleId: e.roleId,
      roleName: roleNames.get(e.roleId),
      resourceId: e.resourceId,
    }));

    return expandPermissions(rawList);
  } catch (error) {
    console.error("Error in getUserPermissionsByUserId:", error);
    throw error;
  }
}
