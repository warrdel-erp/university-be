import { Router } from 'express';
import { z } from 'zod';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { getTermsWithSubject, getTermsData, getTermsWithExamTypes } from '../controllers/termsController.js';

const router = Router();

const termsQuerySchema = z.object({
    courseId: z.coerce.number({ required_error: "courseId is required" }),
    sessionId: z.coerce.number({ required_error: "sessionId is required" })
});

const termsExamTypeQuerySchema = z.object({
    courseId: z.coerce.number({ required_error: "courseId is required" }),
});

const termsListSchema = z.object({
    instituteId: z.coerce.number({
        required_error: "instituteId is required"
    }),
    acedmicYearId: z.coerce.number({
        required_error: "academicYearId is required"
    })
});

router.get('/withSubjectAndSection', userAuth, validate({ query: termsQuerySchema }), getTermsData);


router.get('/withExamTypesPerCourse', userAuth, validate({ query: termsExamTypeQuerySchema }), getTermsWithExamTypes);

router.get('/list/withSubject', userAuth, validate({ query: termsListSchema }), getTermsWithSubject);

export default router;
