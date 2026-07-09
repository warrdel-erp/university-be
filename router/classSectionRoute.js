import { Router } from 'express';
const router = Router();
import { getClassSectionsByFilter } from '../controllers/mainController.js';
import userAuth from '../middleware/authUser.js';

import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

router.get('/', userAuth, checkAccess(PERMISSIONS.CLASS_SETUP.value, null), getClassSectionsByFilter);

export default router;
