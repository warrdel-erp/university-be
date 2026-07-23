import { Router } from 'express';
import { z } from 'zod';
import { getClassSectionsByFilter } from '../controllers/mainController.js';
import { deleteClassSectionTerm, renameClassSection } from '../controllers/classSectionController.js';
import userAuth from '../middleware/authUser.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
  .number()
  .int('id must be an integer')
  .positive('id must be greater than 0');

const deleteClassSectionTermQuerySchema = z.object({
  classSectionId: z.coerce
    .number()
    .int('Class section id must be a whole number.')
    .positive('Class section id must be greater than 0.'),
});

const renameClassSectionSchema = z.object({
  classSectionId: positiveIntegerId,
  section: z.string().trim().min(1, 'section is required'),
});

router.get('/', userAuth, checkAccess(PERMISSIONS.CLASS_SETUP.value, null), getClassSectionsByFilter);
router.patch('/section', userAuth, checkAccess(PERMISSIONS.CLASS_SETUP.value, null), validate({ body: renameClassSectionSchema }), renameClassSection);
router.delete('/term', userAuth, checkAccess(PERMISSIONS.CLASS_SETUP.value, null), validate({ query: deleteClassSectionTermQuerySchema }), deleteClassSectionTerm);

export default router;
