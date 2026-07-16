import { Router } from 'express';
import { z } from 'zod';

const router = Router();

import {
    addLesson,
    getAllLesson,
    getSingleLessonDetails,
    addTopice,
    addMapping,
    copyMapping,
    getMapping,
    updateMapping,
    updateCompleteMapping,
    deleteMapping,
    getEmployeeSubjectAndLesson,
    getSimpleLessonList,
    linkLessonsToWindow,
} from "../controllers/lessonController.js";

import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const dateOnly = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

const linkLessonQuerySchema = z.object({
    lessonId: positiveIntegerId,
}).strict();

const linkLessonBodySchema = z.object({
    lectureWindowId: positiveIntegerId,
}).strict();

const copyMappingTargetSchema = z.object({
    timeTableMappingId: positiveIntegerId,
    date: dateOnly,
}).strict();

const copyMappingBodySchema = z.object({
    sourceLessonMappingId: positiveIntegerId,
    targets: z.array(copyMappingTargetSchema).min(1, 'at least one target is required'),
    note: z.string().optional().nullable(),
    lectureUrl: z.string().optional().nullable(),
    file: z.any().optional().nullable(),
}).strict();

router.post('/', userAuth, addLesson);

router.get('/', userAuth, getAllLesson);

router.get('/simple', userAuth, getSimpleLessonList);

router.get('/single', userAuth, getSingleLessonDetails);

router.post('/topic', userAuth, addTopice);

router.post('/mapping', userAuth, addMapping);

router.post(
    '/mapping/copy',
    userAuth,
    validate({ body: copyMappingBodySchema }),
    copyMapping,
);

router.get('/mapping', userAuth, getMapping);

router.patch('/', userAuth, updateMapping);

router.patch('/mapping/:lessonMappingId', userAuth, updateCompleteMapping);

router.delete('/mapping/:lessonMappingId', userAuth, deleteMapping);

router.get('/employee', userAuth, getEmployeeSubjectAndLesson);

router.post(
    '/link',
    userAuth,
    validate({ query: linkLessonQuerySchema, body: linkLessonBodySchema }),
    linkLessonsToWindow,
);

export default router;
