import { Router } from 'express';
import { z } from 'zod';
import { getTermsData } from '../controllers/termsController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const termsQuerySchema = z.object({
    courseId: z.coerce.number({ required_error: "courseId is required" }),
    sessionId: z.coerce.number({ required_error: "sessionId is required" })
});

router.get('/withSubjectAndSection', userAuth, validate({ query: termsQuerySchema }), getTermsData);

export default router;
