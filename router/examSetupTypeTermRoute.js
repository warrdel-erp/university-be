import { Router } from 'express';
const router = Router();
import * as examSetupTypeTermController from '../controllers/examSetupTypeTermController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { z } from 'zod';

const bulkCreateSchema = z.object({
    examSetupTypeTerms: z.array(z.object({
        examSetupTypeId: z.number(),
        term: z.number(),
        courseId: z.number()
    })).min(1)
});

router.post('/bulk', userAuth, validate(bulkCreateSchema), examSetupTypeTermController.bulkCreateExamSetupTypeTerm);
router.delete('/:id', userAuth, examSetupTypeTermController.deleteExamSetupTypeTerm);


export default router;
