import * as userPermissionService from "../services/userPermissionService.js";
import * as userRoleService from "../services/userRoleService.js";
import * as model from "../models/index.js";
import { PERMISSIONS } from "../const/permissions.js";
import { ROLES } from "../const/roles.js";

/**
 * Combined Role and Permission Assignment
 */
export async function assignAuthorization(req, res) {
  try {
    const { userId, roleId, permissions } = req.body;

    const result = await userRoleService.assignRoleToUser(userId, roleId, permissions);
    return res.status(200).json({
      success: true,
      message: "Authorization assigned successfully",
      data: result,
    });
  } catch (error) {
    console.error("Controller: Error in assignAuthorization:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to assign authorization",
    });
  }
}

/**
 * Get current user's roles and permissions
 */
export async function getMyAuthorization(req, res) {
  try {
    const { userId } = req.user;

    const data = await userRoleService.getUserAuthorization(userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Controller: Error in getMyAuthorization:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch authorization",
    });
  }
}

/**
 * Get user's permissions by ID (Keeping for admin check if needed)
 */
export async function getPermissionsById(req, res) {
  try {
    const { userId } = req.params;

    const permissions = await userRoleService.getUserAuthorization(userId);
    console.log("SERVER RESPONSE DATA FOR", userId, ":", JSON.stringify(permissions, null, 2));
    return res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error("Controller: Error in getPermissionsById:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch permissions",
    });
  }
}

/**
 * Remove Role (and permissions if admin)
 */
export async function removeRole(req, res) {
  try {
    const { userId, roleId } = req.body;

    await userRoleService.removeRoleFromUser(userId, roleId);
    return res.status(200).json({
      success: true,
      message: `Role ID ${roleId} removed successfully`,
    });
  } catch (error) {
    console.error("Controller: Error in removeRole:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to remove role",
    });
  }
}

// Keeping assignPermissions if they still want independent permission management for existing admins
export async function assignPermissions(req, res) {
  try {
    const { userId, roleId, permissions } = req.body;

    const result = await userPermissionService.assignPermissionsToUser(userId, roleId, permissions);
    return res.status(200).json({
      success: true,
      message: "Permissions assigned successfully",
      data: result,
    });
  } catch (error) {
    console.error("Controller: Error in assignPermissions:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign permissions",
    });
  }
}

import { SCOPES } from "../const/scopes.js";
// PERMISSIONS already imported at the top of this file

export async function getAllScopes(req, res) {
  try {
    const scopes = Object.keys(SCOPES).map((key) => ({
      scopeId: key,
      scopeKey: SCOPES[key],
    }));
    return res.status(200).json({
      success: true,
      data: scopes,
    });
  } catch (error) {
    console.error("Controller: Error in getAllScopes:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch scopes",
    });
  }
}

export async function getAllPermissions(req, res) {
  try {
    const userId = req.user.userId;
    const permissions = await model.userRolePermissionModel.findAll({
      where: { user_id: userId },
      attributes: ["permission", "scope", "roleId"],
      raw: true,
    });

    // The frontend expects the data array directly
    return res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error("Controller: Error in getAllPermissions:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch permissions",
    });
  }
}
