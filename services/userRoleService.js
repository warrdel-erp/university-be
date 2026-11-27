import { Op } from "sequelize";
import * as repository from "../repository/userRoleRepository.js";
import * as permissionRepository from "../repository/userPermissionRepository.js";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

/**
 * Assign a role to a user. `resourceIds` are the institute/campus/... ids the role applies to,
 * according to the role's scope (not needed for UNIVERSITY/OWN roles).
 */
export async function assignRoleToUser(userId, roleId, resourceIds = [], transaction = null) {
  const runner = async (activeTransaction) => {
    const user = await model.userModel.findByPk(userId, {
      attributes: ["userId", "universityId"],
      transaction: activeTransaction,
    });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    const universityId = user.universityId;

    const roleWhere = isNaN(Number(roleId))
      ? { role: roleId, universityId }
      : { roleId: Number(roleId), universityId };

    const roleData = await model.roleModel.findOne({
      where: roleWhere,
      transaction: activeTransaction,
    });

    if (!roleData) {
      throw new Error(`Role not found: ${roleId}`);
    }
    const roleName = String(roleData.role).trim().toUpperCase();

    const roleExists = await repository.checkUserRoleExists(userId, roleData.roleId, activeTransaction);
    if (roleExists) {
      throw new Error(`User already has the role: ${roleName}`);
    }

    // Add role
    return await repository.addUserRole(userId, roleData.roleId, resourceIds, activeTransaction);
  };

  if (transaction) {
    return runner(transaction);
  }
  return withAuditEvent(AUDIT_EVENTS.USER_ROLE_ASSIGN, async ({ transaction: auditTx }) => {
    return runner(auditTx);
  });
}

export async function removeRoleFromUser(userId, roleId, transaction = null) {
  const runner = async (activeTransaction) => {
    const user = await model.userModel.findByPk(userId, {
      attributes: ["userId", "universityId"],
      transaction: activeTransaction,
    });
    const universityId = user?.universityId;

    const roleWhere = isNaN(Number(roleId))
      ? { role: roleId, universityId }
      : { roleId: Number(roleId), universityId };

    const roleData = await model.roleModel.findOne({
      where: roleWhere,
      transaction: activeTransaction,
    });

    if (!roleData) {
      throw new Error(`Role not found: ${roleId}`);
    }
    const roleName = String(roleData.role).trim().toUpperCase();

    const roleExists = await repository.checkUserRoleExists(userId, roleData.roleId, activeTransaction);
    if (!roleExists) {
      throw new Error(`User does not have the role: ${roleName}`);
    }

    // Remove role
    await repository.removeUserRole(userId, roleData.roleId, activeTransaction);
    return true;
  };

  if (transaction) {
    return runner(transaction);
  }
  return withAuditEvent(AUDIT_EVENTS.USER_ROLE_REMOVE, async ({ transaction: auditTx }) => {
    return runner(auditTx);
  });
}

export async function getUserRoles(userId) {
  try {
    return await repository.getUserRoles(userId);
  } catch (error) {
    console.error("Service: Error in getUserRoles:", error);
    throw error;
  }
}

export async function getUserAuthorization(userId) {
  try {
    const [roles, permissions] = await Promise.all([
      repository.getUserRoles(userId),
      permissionRepository.getUserPermissionsByUserId(userId),
    ]);
    return { roles, permissions };
  } catch (error) {
    console.error("Service: Error in getUserAuthorization:", error);
    throw error;
  }
}
