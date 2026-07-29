import { Router } from 'express';
import { z } from 'zod';
import { getAllSubjects, setSubjectTerms, getSubjectsWithExamSchedule, deleteSubject } from '../controllers/subjectController.js';
import { getSubjectsWithWeightages } from '../controllers/subjectWeightageController.js';
import userAuth from '../middleware/authUser.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';
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

const deleteSubjectQuerySchema = z.object({
    subjectId: z.coerce.number({ required_error: "subjectId is required" }).int().positive(),
});

router.get('/', userAuth, validate({ query: getAllSubjectsQuerySchema }), getAllSubjects);

router.post('/addTerms', userAuth, checkAccess(PERMISSIONS.SEMESTER_SUBJECT_MAPPING_ASSIGN.value, null), validate({ body: setSubjectTermsSchema }), setSubjectTerms);

router.get('/withExamSchedule', userAuth, validate({ query: subjectsWithScheduleQuerySchema }), getSubjectsWithExamSchedule);

router.get('/withWeightages', userAuth, checkAccess(PERMISSIONS.ASSIGN_WEIGHTAGE.value, null), validate({ query: subjectWeightageListSchema }), getSubjectsWithWeightages);

router.delete('/', userAuth, validate({ query: deleteSubjectQuerySchema }), deleteSubject);

export default router;
