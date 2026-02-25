import express from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../const/permissions.js';
import * as controller from '../controllers/userPermissionController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = express.Router();

const validPermissions = Object.values(PERMISSIONS).map(p => p.value);

const assignPermissionsSchema = z.object({
    userId: z.coerce.number({ required_error: "userId is required" }),
    permissions: z.array(z.enum(validPermissions), { required_error: "permissions is required" })
});

router.post('/assign', userAuth, validate({ body: assignPermissionsSchema }), controller.assignPermissions);
router.get('/my', userAuth, controller.getPermissions);

export default router;
