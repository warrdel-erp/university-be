import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function addRolePermissions(RolePermissionsData) {
  try {
    if (RolePermissionsData.roleId) {
      const role = await model.roleModel.findOne({
        where: { roleId: RolePermissionsData.roleId },
        attributes: ["roleId", "role", "code"],
      });
      if (role?.code) {
        const error = new Error(`Permissions for system-generated role '${role.role}' cannot be modified.`);
        error.statusCode = 403;
        throw error;
      }
    }
    return scoped(model.rolePermissionsModel).create(RolePermissionsData);
  } catch (error) {
    console.error("Error in add RolePermissions :", error);
    throw error;
  }
}

export async function getRolePermissionsDetails() {
  try {
    return scoped(model.rolePermissionsModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id"] },
      include: [
        {
          model: model.roleModel,
          as: "role",
          attributes: ["role"],
        }
      ],
    });
  } catch (error) {
    console.error("Error fetching RolePermissions details:", error);
    throw error;
  }
}

export async function getSingleRolePermissionsDetails(rolePermissionsId) {
  try {
    return scoped(model.rolePermissionsModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id"] },
      where: { rolePermissionsId },
      include: [
        {
          model: model.roleModel,
          as: "role",
          attributes: ["role"],
        }
      ],
    });
  } catch (error) {
    console.error("Error fetching RolePermissions details:", error);
    throw error;
  }
}

export async function deleteRolePermissions(rolePermissionsId) {
  const existing = await scoped(model.rolePermissionsModel).findOne({
    attributes: ["rolePermissionsId", "roleId"],
    where: { rolePermissionsId },
    include: [
      {
        model: model.roleModel,
        as: "role",
        attributes: ["roleId", "role", "code"],
      },
    ],
  });
  if (!existing) {
    return false;
  }

  if (existing.role?.code) {
    const error = new Error(`Permissions for system-generated role '${existing.role.role}' cannot be deleted.`);
    error.statusCode = 403;
    throw error;
  }

  const deleted = await scoped(model.rolePermissionsModel).destroy({
    where: { rolePermissionsId },
  });
  return deleted > 0;
}

export async function updateRolePermissions(rolePermissionsId, RolePermissionsData) {
  try {
    const existing = await scoped(model.rolePermissionsModel).findOne({
      attributes: ["rolePermissionsId", "roleId"],
      where: { rolePermissionsId },
      include: [
        {
          model: model.roleModel,
          as: "role",
          attributes: ["roleId", "role", "code"],
        },
      ],
    });
    if (!existing) {
      return [0];
    }

    if (existing.role?.code) {
      const error = new Error(`Permissions for system-generated role '${existing.role.role}' cannot be modified.`);
      error.statusCode = 403;
      throw error;
    }

    return scoped(model.rolePermissionsModel).update(RolePermissionsData, {
      where: { rolePermissionsId },
    });
  } catch (error) {
    console.error(`Error updating RolePermissions creation ${rolePermissionsId}:`, error);
    throw error;
  }
}

export async function getPermissionByRole(roleId) {
  try {
    return scoped(model.rolePermissionsModel).findAll({
      attributes: ["role_id", "permission", "scope"],
      where: { roleId },
    });
  } catch (error) {
    console.error("Error fetching RolePermission details:", error);
    throw error;
  }
}
