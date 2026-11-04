import * as RoleCreationService from "../repository/roleRepository.js";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";
import { PERMISSIONS } from "../const/permissions.js";
import { VALID_SCOPES } from "../const/scopes.js";
import { isSystemRole } from "../const/roles.js";
import { isPermissionAllowedForScope, getEffectiveScope } from "../utility/permissionUtility.js";

function assertValidScope(scope) {
  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(`Invalid scope '${scope}'. Allowed: ${VALID_SCOPES.join(", ")}`);
  }
}

// Permissions the role may not hold because they don't fit the role's scope
function findDisallowedPermissions(permissionKeys, scope) {
  return permissionKeys.filter(
    (key) => !PERMISSIONS[key] || !isPermissionAllowedForScope(key, scope),
  );
}

export async function addRole(RoleData) {
  assertValidScope(RoleData.scope || "INSTITUTE");
  if (isSystemRole(RoleData.role)) {
    const error = new Error(`Cannot create role with reserved system name '${RoleData.role}'.`);
    error.statusCode = 403;
    throw error;
  }
  const existing = await RoleCreationService.findRoleByRoleName(RoleData.role);
  if (existing) {
    const error = new Error(`Role with name '${RoleData.role}' already exists.`);
    error.statusCode = 400;
    throw error;
  }
  return RoleCreationService.addRole({ ...RoleData, scope: RoleData.scope || "INSTITUTE" });
}

export async function getRoleDetails() {
  return RoleCreationService.getRoleDetails();
}

export async function getSingleRoleDetails(roleId) {
  return RoleCreationService.getSingleRoleDetails(roleId);
}

export async function deleteRole(roleId) {
  const role = await model.roleModel.findOne({ where: { roleId } });
  if (!role) {
    return false;
  }
  if (isSystemRole(role)) {
    const error = new Error(`System role '${role.role}' cannot be deleted.`);
    error.statusCode = 403;
    throw error;
  }
  return RoleCreationService.deleteRole(roleId);
}

export async function updateRole(roleId, RoleData) {
  const role = await model.roleModel.findOne({ where: { roleId } });
  if (!role) {
    const error = new Error(`Role not found: ${roleId}`);
    error.statusCode = 404;
    throw error;
  }
  if (isSystemRole(role)) {
    const error = new Error(`System role '${role.role}' cannot be modified.`);
    error.statusCode = 403;
    throw error;
  }
  if (RoleData.role && isSystemRole(RoleData.role)) {
    const error = new Error(`Cannot rename role to reserved system name '${RoleData.role}'.`);
    error.statusCode = 403;
    throw error;
  }

  if (RoleData.scope !== undefined) {
    assertValidScope(RoleData.scope);

    // Narrowing a role's scope must not leave it holding permissions that no longer fit
    const existing = await model.rolePermissionsModel.findAll({ where: { roleId } });
    const disallowed = findDisallowedPermissions(
      existing.map((rp) => rp.permission),
      RoleData.scope,
    );
    if (disallowed.length > 0) {
      throw new Error(
        `Role has permissions not allowed at ${RoleData.scope} scope: ${disallowed.join(", ")}`,
      );
    }
  }
  return RoleCreationService.updateRole(roleId, RoleData);
}

/**
 * Get all permissions of a role.
 * Returns array of { rolePermissionsId, roleId, permission, scope } where `scope` is the
 * scope the permission effectively runs at for this role.
 */
export async function getRolePermissions(roleId) {
  const role = await model.roleModel.findOne({ where: { roleId } });
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  const mappings = await model.rolePermissionsModel.findAll({ where: { roleId } });

  return mappings.map((m) => ({
    rolePermissionsId: m.rolePermissionsId,
    roleId: m.roleId,
    permission: m.permission,
    scope: getEffectiveScope(m.permission, role.scope),
  }));
}

/**
 * Replace a role's permissions.
 * Accepts permission keys (or { permission } objects). Each permission must be allowed
 * at the role's scope (see `possibleScopes` in const/permissions.js).
 * @param {number} roleId
 * @param {Array<string|{permission: string}>} permissions
 */
export async function assignRolePermissions(roleId, permissions, transaction = null) {
  const internalTransaction = !transaction ? await sequelize.transaction() : null;
  const activeTransaction = transaction || internalTransaction;

  try {
    const roleRecord = await model.roleModel.findOne({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    if (!roleRecord) {
      const error = new Error(`Role not found: ${roleId}`);
      error.statusCode = 404;
      throw error;
    }

    if (isSystemRole(roleRecord)) {
      const error = new Error(`Permissions for system role '${roleRecord.role}' cannot be modified.`);
      error.statusCode = 403;
      throw error;
    }

    const keys = [
      ...new Set(permissions.map((p) => (typeof p === "string" ? p : p?.permission)).filter(Boolean)),
    ];

    const disallowed = findDisallowedPermissions(keys, roleRecord.scope);
    if (disallowed.length > 0) {
      throw new Error(
        `Permissions not allowed for a ${roleRecord.scope} role: ${disallowed.join(", ")}`,
      );
    }

    await model.rolePermissionsModel.destroy({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    const result = await model.rolePermissionsModel.bulkCreate(
      keys.map((permission) => ({ roleId: Number(roleId), permission })),
      { transaction: activeTransaction },
    );

    if (internalTransaction) await internalTransaction.commit();
    return result;
  } catch (error) {
    if (internalTransaction) await internalTransaction.rollback();
    throw error;
  }
}
