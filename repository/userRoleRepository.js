import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function addUserRole(userId, role, transaction = null) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
      transaction,
    });
    if (!user) {
      throw new Error("User not found");
    }

    return scoped(model.userRoleModel).create({ userId, role }, { transaction });
  } catch (error) {
    console.error("Repository: Error in addUserRole:", error);
    throw error;
  }
}

export async function removeUserRole(userId, role, transaction = null) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
      transaction,
    });
    if (!user) {
      return 0;
    }

    return scoped(model.userRoleModel).destroy({
      where: { userId, role },
      transaction,
    });
  } catch (error) {
    console.error("Repository: Error in removeUserRole:", error);
    throw error;
  }
}

export async function getUserRoles(userId) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
    });
    if (!user) {
      return [];
    }

    const roles = await scoped(model.userRoleModel).findAll({
      where: { userId },
      attributes: ["role"],
    });
    return roles.map((r) => r.role);
  } catch (error) {
    console.error("Repository: Error in getUserRoles:", error);
    throw error;
  }
}

export async function checkUserRoleExists(userId, role) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
    });
    if (!user) {
      return false;
    }

    const count = await scoped(model.userRoleModel).count({
      where: { userId, role },
    });
    return count > 0;
  } catch (error) {
    console.error("Repository: Error in checkUserRoleExists:", error);
    throw error;
  }
}
