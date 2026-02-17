import { Router } from 'express';
import { z } from 'zod';
import { getAllSubjects, setSubjectTerms } from '../controllers/subjectController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const setSubjectTermsSchema = z.array(z.object({
    subjectId: z.number().int().positive(),
    term: z.number().int().positive()
}));

router.get('/', userAuth, getAllSubjects);
router.post('/addTerms', userAuth, validate({ body: setSubjectTermsSchema }), setSubjectTerms);

export default router;
