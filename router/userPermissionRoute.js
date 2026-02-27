import express from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../const/permissions.js';
import { ROLES } from '../const/roles.js';
import * as userPermissionController from '../controllers/userPermissionController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = express.Router();

const validPermissions = Object.values(PERMISSIONS).map(p => p.value);
const validRoles = Object.values(ROLES);

// Combined Assign Authorization Schema
const assignAuthSchema = z.object({
    userId: z.coerce.number({ required_error: "userId is required" }),
    role: z.enum(validRoles, { required_error: "role is required" }),
    permissions: z.array(z.enum(validPermissions)).optional()
}).refine(data => {
    // If Admin role is being assigned, permissions are mandatory
    if (data.role === ROLES.ADMIN) {
        return data.permissions && data.permissions.length > 0;
    }
    return true;
}, {
    message: "Permissions are mandatory when assigning ADMIN role",
    path: ["permissions"]
});

const removeRoleSchema = z.object({
    userId: z.coerce.number({ required_error: "userId is required" }),
    role: z.enum(validRoles, { required_error: "role is required" })
});

const getByIdSchema = z.object({
    userId: z.coerce.number({ required_error: "userId is required" })
});

const assignPermissionsSchema = z.object({
    userId: z.coerce.number({ required_error: "userId is required" }),
    permissions: z.array(z.enum(validPermissions), { required_error: "permissions is required" })
});

// Independent Permission Assignment
router.post('/permissions/assign', userAuth, validate({ body: assignPermissionsSchema }), userPermissionController.assignPermissions);

// Combined API for Roles and Permissions
router.post('/assign', userAuth, validate({ body: assignAuthSchema }), userPermissionController.assignAuthorization);

// Remove Role (Also removes permissions if role is ADMIN)
router.delete('/role/remove', userAuth, validate({ body: removeRoleSchema }), userPermissionController.removeRole);

// Get My Authorization (Roles + Permissions)
router.get('/my', userAuth, userPermissionController.getMyAuthorization);

// Get specific user authorization
router.get('/getByUserId/:userId', userAuth, validate({ params: getByIdSchema }), userPermissionController.getPermissionsById);

export default router;
