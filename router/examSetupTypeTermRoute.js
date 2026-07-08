import { Router } from 'express';
const router = Router();
import * as examSetupTypeTermController from '../controllers/examSetupTypeTermController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { z } from 'zod';

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const bulkCreateSchema = z.object({
    examSetupTypeTerms: z.array(z.object({
        examSetupTypeId: z.number(),
        term: z.number(),
        courseId: z.number()
    })).min(1)
});

router.post('/bulk', userAuth, checkAccess(PERMISSIONS.EXAM_TYPE_TERM_MAPPING_ADD.value, 'examSetupTypeTerm'), validate(bulkCreateSchema), examSetupTypeTermController.bulkCreateExamSetupTypeTerm);
router.delete('/:id', userAuth, checkAccess(PERMISSIONS.EXAM_TYPE_TERM_MAPPING_DELETE.value, 'examSetupTypeTerm'), examSetupTypeTermController.deleteExamSetupTypeTerm);


export default router;
