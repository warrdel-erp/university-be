import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function addPermission(PermissionData, options = {}) {
  try {
    return scoped(model.permissionModel).create(PermissionData, options);
  } catch (error) {
    console.error("Error in add Permission :", error);
    throw error;
  }
}

export async function getPermissionDetails() {
  try {
    return scoped(model.permissionModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    });
  } catch (error) {
    console.error("Error fetching Permission details:", error);
    throw error;
  }
}

export async function getSinglePermissionDetails(permissionId) {
  try {
    return scoped(model.permissionModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: { permissionId },
    });
  } catch (error) {
    console.error("Error fetching Permission details:", error);
    throw error;
  }
}

export async function deletePermission(permissionId, options = {}) {
  const existing = await scoped(model.permissionModel).findOne({
    attributes: ["permissionId"],
    where: { permissionId },
    ...options,
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.permissionModel).destroy({ where: { permissionId }, ...options });
  return deleted > 0;
}

export async function updatePermission(permissionId, PermissionData, options = {}) {
  try {
    const existing = await scoped(model.permissionModel).findOne({
      attributes: ["permissionId"],
      where: { permissionId },
      ...options,
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.permissionModel).update(PermissionData, { where: { permissionId }, ...options });
  } catch (error) {
    console.error(`Error updating Permission creation ${permissionId}:`, error);
    throw error;
  }
}
