import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function addRolePermissionMapping(RolePermissionMappingData) {
  try {
    return scoped(model.rolePermissionMappingModel).create(RolePermissionMappingData);
  } catch (error) {
    console.error("Error in add RolePermissionMapping :", error);
    throw error;
  }
}

export async function getRolePermissionMappingDetails() {
  try {
    return scoped(model.rolePermissionMappingModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id", "permission_id"] },
      include: [
        {
          model: model.roleModel.unscoped(),
          as: "userMapped",
          attributes: ["role"],
        },
        {
          model: model.permissionModel.unscoped(),
          as: "permissionMapped",
          attributes: ["permission"],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching RolePermissionMapping details:", error);
    throw error;
  }
}

export async function getSingleRolePermissionMappingDetails(rolePermissionMappingId) {
  try {
    return scoped(model.rolePermissionMappingModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "role_id", "permission_id"] },
      where: { rolePermissionMappingId },
      include: [
        {
          model: model.roleModel.unscoped(),
          as: "userMapped",
          attributes: ["role"],
        },
        {
          model: model.permissionModel.unscoped(),
          as: "permissionMapped",
          attributes: ["permission"],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching RolePermissionMapping details:", error);
    throw error;
  }
}

export async function deleteRolePermissionMapping(rolePermissionMappingId) {
  const existing = await scoped(model.rolePermissionMappingModel).findOne({
    attributes: ["rolePermissionMappingId"],
    where: { rolePermissionMappingId },
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.rolePermissionMappingModel).destroy({
    where: { rolePermissionMappingId },
  });
  return deleted > 0;
}

export async function updateRolePermissionMapping(rolePermissionMappingId, RolePermissionMappingData) {
  try {
    const existing = await scoped(model.rolePermissionMappingModel).findOne({
      attributes: ["rolePermissionMappingId"],
      where: { rolePermissionMappingId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.rolePermissionMappingModel).update(RolePermissionMappingData, {
      where: { rolePermissionMappingId },
    });
  } catch (error) {
    console.error(`Error updating RolePermissionMapping creation ${rolePermissionMappingId}:`, error);
    throw error;
  }
}

export async function getPermissionByRole(roleId) {
  try {
    return scoped(model.rolePermissionMappingModel).findAll({
      attributes: ["role_id", "permission_id"],
      where: { roleId },
    });
  } catch (error) {
    console.error("Error fetching RolePermission details:", error);
    throw error;
  }
}
