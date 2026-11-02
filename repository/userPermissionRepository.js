import * as model from "../models/index.js";
import { SCOPES } from "../const/scopes.js";
import { expandPermissions, getEffectiveScope } from "../utility/permissionUtility.js";

/**
 * Get all permission+scope entries for a user.
 * A user has no permissions of their own: they come from the roles the user holds.
 * Scope is the role's scope; resourceIds are the ones chosen when the role was assigned.
 * Optionally filter by roleId.
 */
export async function getUserPermissionsByUserId(userId, roleId = null) {
  try {
    const where = { userId };
    if (roleId) where.roleId = roleId;

    const assignments = await model.userRolePermissionModel.findAll({
      where,
      attributes: ["roleId", "resourceId"],
      include: [{ model: model.roleModel, as: "userRole", attributes: ["roleId", "role", "scope"] }],
    });

    if (assignments.length === 0) {
      return [];
    }

    // roleId -> { role, scope, resourceIds }
    const roles = new Map();
    for (const a of assignments) {
      if (!a.userRole) continue;
      if (!roles.has(a.roleId)) {
        roles.set(a.roleId, { role: a.userRole.role, scope: a.userRole.scope, resourceIds: [] });
      }
      if (a.resourceId !== null && a.resourceId !== undefined) {
        roles.get(a.roleId).resourceIds.push(a.resourceId);
      }
    }

    const entries = await model.rolePermissionsModel.findAll({
      where: { roleId: [...roles.keys()] },
      attributes: ["roleId", "permission"],
    });

    const rawList = entries.map((e) => {
      const r = roles.get(e.roleId);
      const scope = getEffectiveScope(e.permission, r.scope);
      const resourceIds = r.scope === SCOPES.UNIVERSITY
        ? (scope === SCOPES.MY ? [userId] : 'ALL')
        : (scope === SCOPES.MY ? [userId] : (scope === r.scope ? [...r.resourceIds] : []));
      return {
        permission: e.permission,
        scope,
        roleId: e.roleId,
        roleName: r.role,
        resourceIds,
      };
    });

    return expandPermissions(rawList);
  } catch (error) {
    console.error("Error in getUserPermissionsByUserId:", error);
    throw error;
  }
}
