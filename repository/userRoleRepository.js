import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";
import sequelize from "../database/sequelizeConfig.js";
import { SCOPES } from "../const/scopes.js";

const RESOURCE_SCOPES = [SCOPES.INSTITUTE, SCOPES.CAMPUS, SCOPES.DEPARTMENT];

/**
 * Work out which resource rows a role assignment needs, based on the role's scope.
 *  - UNIVERSITY / MY roles need no resource (single row, resource NULL)
 *  - INSTITUTE / CAMPUS / DEPARTMENT roles need the resource ids chosen at assignment.
 *    If none are given, INSTITUTE/CAMPUS fall back to the user's own institute (and its campus).
 */
async function resolveResourceIds(user, role, requestedIds, transaction) {
  if (!RESOURCE_SCOPES.includes(role.scope)) {
    return [null];
  }

  let ids = [...new Set((requestedIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];

  if (ids.length === 0 && (role.scope === SCOPES.INSTITUTE || role.scope === SCOPES.CAMPUS)) {
    let instituteId = user.defaultInstituteId;
    if (!instituteId) {
      const employee = await model.employeeModel.findOne({ where: { userId: user.userId }, attributes: ["instituteId"], transaction });
      instituteId = employee?.instituteId;
    }
    if (!instituteId) {
      const student = await model.studentModel.findOne({ where: { userId: user.userId }, attributes: ["instituteId"], transaction });
      instituteId = student?.instituteId;
    }
    if (instituteId && role.scope === SCOPES.INSTITUTE) {
      ids = [Number(instituteId)];
    } else if (instituteId) {
      const institute = await model.instituteModel.findOne({ where: { instituteId }, attributes: ["campusId"], transaction });
      if (institute?.campusId) ids = [Number(institute.campusId)];
    }
  }

  if (ids.length === 0) {
    throw new Error(`Role '${role.role}' is ${role.scope}-scoped: select the ${role.scope.toLowerCase()}(s) it applies to`);
  }

  // Institutes / campuses must belong to the user's university
  const resourceModel =
    role.scope === SCOPES.INSTITUTE ? model.instituteModel : role.scope === SCOPES.CAMPUS ? model.campusModel : null;
  if (resourceModel) {
    const pk = role.scope === SCOPES.INSTITUTE ? "instituteId" : "campusId";
    const found = await resourceModel.findAll({
      where: { [pk]: { [Op.in]: ids }, universityId: user.universityId },
      attributes: [pk],
      transaction,
    });
    const foundIds = new Set(found.map((f) => Number(f[pk])));
    const invalid = ids.filter((id) => !foundIds.has(id));
    if (invalid.length > 0) {
      throw new Error(`Invalid ${role.scope.toLowerCase()} id(s) for user's university: ${invalid.join(", ")}`);
    }
  }

  return ids;
}

/**
 * Assign a role to a user: one row per resource in user_role_permission_scope.
 * The user's permissions come from the role's role_permissions; the role's scope
 * plus these resources decide where they apply.
 */
export async function addUserRole(userId, roleId, resourceIds = [], transaction = null) {
  try {
    const user = await model.userModel.findOne({
      attributes: ["userId", "universityId", "defaultInstituteId"],
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

    if (role.universityId != null && role.universityId !== user.universityId) {
      throw new Error(`Role does not belong to user's university`);
    }

    const resolved = await resolveResourceIds(user, role, resourceIds, transaction);

    await model.userRolePermissionModel.bulkCreate(
      resolved.map((resourceId) => ({
        userId,
        roleId: role.roleId,
        resourceId,
        universityId: user.universityId || role.universityId || null,
      })),
      { transaction },
    );

    return { userId, roleId: role.roleId, roleName: role.role, scope: role.scope, resourceIds: resolved.filter((r) => r !== null) };
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
      include: [{ model: model.roleModel, as: "userRole", attributes: ["roleId", "role", "scope"] }],
      raw: false,
    });

    // Extract unique roles in memory to avoid DISTINCT SQL conflicts with 'include'
    const rolesMap = new Map();
    entries.forEach((e) => {
      if (e.userRole) {
        if (!rolesMap.has(e.userRole.roleId)) {
          rolesMap.set(e.userRole.roleId, {
            roleId: e.userRole.roleId,
            roleName: e.userRole.role,
            scope: e.userRole.scope,
            resourceIds: [],
          });
        }
        if (e.resourceId) {
          rolesMap.get(e.userRole.roleId).resourceIds.push(e.resourceId);
        }
      }
    });
    return Array.from(rolesMap.values());
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
    attributes: ["userId", "resourceId"],
    include: [
      {
        model: model.roleModel,
        as: "userRole",
        attributes: ["roleId", "role", "scope"],
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
    if (!userRoles.has(entry.userRole.roleId)) {
      userRoles.set(entry.userRole.roleId, {
        roleId: entry.userRole.roleId,
        roleName: entry.userRole.role,
        scope: entry.userRole.scope,
        resourceIds: [],
      });
    }
    if (entry.resourceId) {
      userRoles.get(entry.userRole.roleId).resourceIds.push(entry.resourceId);
    }
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
export async function checkUserRoleExists(userId, roleId, transaction = null) {
  try {
    let role;
    if (isNaN(Number(roleId))) {
      const user = await model.userModel.findOne({
        attributes: ["userId", "universityId"],
        where: { userId },
        transaction,
      });
      const universityId = user?.universityId;
      role = await model.roleModel.findOne({
        where: { role: roleId, universityId },
        transaction,
      });
    } else {
      role = await model.roleModel.findOne({
        where: { roleId: Number(roleId) },
        transaction,
      });
    }
    if (!role) {
      return false;
    }

    const count = await model.userRolePermissionModel.count({
      where: { userId, roleId: role.roleId },
      transaction,
    });
    return count > 0;
  } catch (error) {
    console.error("Repository: Error in checkUserRoleExists:", error);
    throw error;
  }
}
