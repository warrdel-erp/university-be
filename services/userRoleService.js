import { Op } from "sequelize";
import * as repository from "../repository/userRoleRepository.js";
import * as permissionRepository from "../repository/userPermissionRepository.js";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";

export async function assignRoleToUser(userId, roleId, permissions = [], transaction = null) {
  const internalTransaction = !transaction ? await sequelize.transaction() : null;
  const activeTransaction = transaction || internalTransaction;
  try {
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
    const roleResult = await repository.addUserRole(userId, roleData.roleId, activeTransaction);

    if (internalTransaction) await internalTransaction.commit();
    return roleResult;
  } catch (error) {
    if (internalTransaction) await internalTransaction.rollback();
    console.error("Service: Error in assignRoleToUser:", error);
    throw error;
  }
}

export async function removeRoleFromUser(userId, roleId, transaction = null) {
  const internalTransaction = !transaction ? await sequelize.transaction() : null;
  const activeTransaction = transaction || internalTransaction;
  try {
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

    if (internalTransaction) await internalTransaction.commit();
    return true;
  } catch (error) {
    if (internalTransaction) await internalTransaction.rollback();
    console.error("Service: Error in removeRoleFromUser:", error);
    throw error;
  }
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
