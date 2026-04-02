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

const getAllSubjectsQuerySchema = z.object({}).catchall(z.any());

router.get('/', userAuth, validate({ query: getAllSubjectsQuerySchema }), getAllSubjects);
router.post('/addTerms', userAuth, validate({ body: setSubjectTermsSchema }), setSubjectTerms);

export default router;
