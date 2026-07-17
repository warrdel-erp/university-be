import express from "express";
import { z } from "zod";
import { PERMISSIONS } from "../const/permissions.js";
import { ROLES } from "../const/roles.js";
import * as userPermissionController from "../controllers/userPermissionController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const router = express.Router();

const validPermissions = Object.values(PERMISSIONS).map((p) => p.value);
const validRoles = Object.values(ROLES);

// Combined Assign Authorization Schema
const assignAuthSchema = z.object({
  userId: z.coerce.number({ required_error: "userId is required" }),
  roleId: z.coerce.number({ required_error: "roleId is required" }),
  permissions: z.array(z.enum(validPermissions)).optional(),
});

const removeRoleSchema = z.object({
  userId: z.coerce.number({ required_error: "userId is required" }),
  roleId: z.coerce.number({ required_error: "roleId is required" }),
});

const getByIdSchema = z.object({
  userId: z.coerce.number({ required_error: "userId is required" }),
});

const permissionOverrideSchema = z.union([
  z.string(),
  z.object({
    permission: z.string(),
    scope: z.string(),
    resourceIds: z.array(z.number()).optional(),
  }),
]);

const assignPermissionsSchema = z.object({
  userId: z.coerce.number({ required_error: "userId is required" }),
  roleId: z.coerce.number({ required_error: "roleId is required" }),
  permissions: z.array(permissionOverrideSchema, { required_error: "permissions is required" }),
});

import { checkAccess } from "../middleware/checkAccess.js";

// Independent Permission Assignment (Overrides)
router.post(
  "/permissions/assign",
  userAuth,
  checkAccess(PERMISSIONS.ADD_PERMISSION.value, "authorization"),
  validate({ body: assignPermissionsSchema }),
  userPermissionController.assignPermissions,
);

// Combined API for Roles and Permissions
router.post(
  "/assign",
  userAuth,
  checkAccess(PERMISSIONS.ADD_ROLE.value, "authorization"),
  validate({ body: assignAuthSchema }),
  userPermissionController.assignAuthorization,
);

// Remove Role
router.delete(
  "/role/remove",
  userAuth,
  checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, "authorization"),
  validate({ body: removeRoleSchema }),
  userPermissionController.removeRole,
);

// Get My Authorization (Roles + Permissions)
router.get("/my", userAuth, userPermissionController.getMyAuthorization);

// Get specific user authorization
router.get(
  "/getByUserId/:userId",
  userAuth,
  checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null),
  validate({ params: getByIdSchema }),
  userPermissionController.getPermissionsById,
);

// Get all scopes & permissions
router.get("/scopes", userAuth, checkAccess(PERMISSIONS.ROLES_ACCESS_CONTROL.value, null), userPermissionController.getAllScopes);
router.get("/permissions", userAuth, userPermissionController.getAllPermissions);

export default router;
