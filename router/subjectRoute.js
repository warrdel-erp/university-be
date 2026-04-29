import { Router } from 'express';
import { z } from 'zod';
import { getAllSubjects, setSubjectTerms, getSubjectsWithExamSchedule } from '../controllers/subjectController.js';
import { getSubjectsWithWeightages } from '../controllers/subjectWeightageController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const setSubjectTermsSchema = z.array(z.object({
    subjectId: z.number().int().positive(),
    term: z.number().int().positive()
}));

const getAllSubjectsQuerySchema = z.object({}).catchall(z.any());

const subjectsWithScheduleQuerySchema = z.object({
    examSetupTypeTermId: z.coerce.number({ required_error: "examSetupTypeTermId is required" }).int().positive(),
    sessionId: z.coerce.number().int().positive().optional(),
});

const subjectWeightageListSchema = z.object({
    sessionId: z.coerce.number({ required_error: "sessionId is required" }).int().positive(),
    courseId: z.coerce.number({ required_error: "courseId is required" }).int().positive(),
    term: z.coerce.number({ required_error: "term is required" }).int().positive(),
});

router.get('/', userAuth, validate({ query: getAllSubjectsQuerySchema }), getAllSubjects);

router.post('/addTerms', userAuth, validate({ body: setSubjectTermsSchema }), setSubjectTerms);

router.get('/withExamSchedule', userAuth, validate({ query: subjectsWithScheduleQuerySchema }), getSubjectsWithExamSchedule);

router.get('/withWeightages', userAuth, validate({ query: subjectWeightageListSchema }), getSubjectsWithWeightages);

export default router;
