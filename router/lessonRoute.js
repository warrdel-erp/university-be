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

router.post('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), addLesson);

router.get('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getAllLesson);

router.get('/simple', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getSimpleLessonList);

router.get('/single', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getSingleLessonDetails);

router.post('/topic', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), addTopice);

router.post(
    '/mapping/copy',
    userAuth,
    validate({ body: copyMappingBodySchema }),
    copyMapping,
);

router.get('/mapping', userAuth, getMapping);

router.get('/mapping', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getMapping);

router.patch('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_EDIT.value, null), updateMapping);

router.patch('/mapping/:lessonMappingId', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_EDIT.value, null), updateCompleteMapping);

router.delete('/mapping/:lessonMappingId', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_DELETE.value, null), deleteMapping);

router.get('/employee', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getEmployeeSubjectAndLesson);

router.post(
    '/link',
    userAuth,
    validate({ query: linkLessonQuerySchema, body: linkLessonBodySchema }),
    linkLessonsToWindow,
);

export default router;
