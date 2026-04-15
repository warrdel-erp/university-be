import { Router } from 'express';
const router = Router();
import * as examSetupTypeController from '../controllers/examSetupTypeController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { z } from 'zod';

const getExamSetupTypesSchema = z.object({
    query: z.object({
        courseId: z.string().regex(/^\d+$/).transform(Number),
        term: z.string().regex(/^\d+$/).transform(Number)
    }).optional()
});

router.get('/', userAuth, validate(getExamSetupTypesSchema), examSetupTypeController.getExamSetupTypes);

export default router;
