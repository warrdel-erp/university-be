import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function clearAllUserPermissions(userId, transaction = null) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
      transaction,
    });
    if (!user) {
      return 0;
    }

    return model.userPermissionModel.unscoped().destroy({
      where: { userId },
      transaction,
    });
  } catch (error) {
    console.error("Repository: Error in clearAllUserPermissions:", error);
    throw error;
  }
}

export async function setUserPermissions(userId, permissions, transaction = null) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
      transaction,
    });
    if (!user) {
      throw new Error("User not found");
    }

    const dataToInsert = permissions.map((perm) => ({
      userId,
      permission: perm,
    }));

    return model.userPermissionModel.unscoped().bulkCreate(dataToInsert, { transaction });
  } catch (error) {
    console.error("Repository: Error in setUserPermissions:", error);
    throw error;
  }
}

export async function clearAndSetUserPermissions(userId, permissions) {
  const transaction = await model.userPermissionModel.sequelize.transaction();
  try {
    await clearAllUserPermissions(userId, transaction);
    const result = await setUserPermissions(userId, permissions, transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in clearAndSetUserPermissions :", error);
    throw error;
  }
}

export async function getUserPermissionsByUserId(userId) {
  try {
    const user = await scoped(model.userModel).findOne({
      attributes: ["userId"],
      where: { userId },
    });
    if (!user) {
      return [];
    }

    const permissions = await model.userPermissionModel.unscoped().findAll({
      where: { userId },
      attributes: ["permission"],
    });
    return permissions.map((p) => p.permission);
  } catch (error) {
    console.error("Error in getUserPermissionsByUserId :", error);
    throw error;
  }
}
