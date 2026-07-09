import { Router } from 'express';
import { z } from 'zod';
import { getClassSectionsByFilter } from '../controllers/mainController.js';
import { deleteClassSectionTerm, renameClassSection } from '../controllers/classSectionController.js';
import userAuth from '../middleware/authUser.js';
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

router.get('/', userAuth, getClassSectionsByFilter);
router.patch('/section', userAuth, validate({ body: renameClassSectionSchema }), renameClassSection);
router.delete('/term', userAuth, validate({ query: deleteClassSectionTermQuerySchema }), deleteClassSectionTerm);

export default router;
