import { Router } from 'express';
import { z } from 'zod';
import { getClassSectionsByFilter } from '../controllers/mainController.js';
import { deleteClassSectionTerm } from '../controllers/classSectionController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
  .number()
  .int('id must be an integer')
  .positive('id must be greater than 0');

const deleteClassSectionTermQuerySchema = z.object({
  classSectionId: positiveIntegerId,
});

router.get('/', userAuth, getClassSectionsByFilter);
router.delete('/term', userAuth, validate({ query: deleteClassSectionTermQuerySchema }), deleteClassSectionTerm);

export default router;
