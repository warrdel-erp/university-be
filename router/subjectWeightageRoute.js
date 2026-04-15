import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utility/validation.js';
const router = Router();
import * as subjectWeightageController from '../controllers/subjectWeightageController.js';
import userAuth from '../middleware/authUser.js';

const bulkWeightageSchema = z.object({
    weightages: z.array(z.object({
        examSetupTypeTermId: z.number().int().positive(),
        subjectId: z.number().int().positive(),
        sessionId: z.number().int().positive(),
        weightage: z.number().nonnegative()
    }))
});

router.post('/bulk', userAuth, validate({ body: bulkWeightageSchema }), subjectWeightageController.createWeightageBulk);

export default router;
