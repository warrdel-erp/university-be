import { Router } from 'express';
import { z } from 'zod';

const router = Router();

import {
    addLesson,
    getAllLesson,
    getSingleLessonDetails,
    addTopice,
    addMapping,
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

const linkLessonQuerySchema = z.object({
    lessonId: positiveIntegerId,
}).strict();

const linkLessonBodySchema = z.object({
    lectureWindowId: positiveIntegerId,
}).strict();

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), addLesson);

router.get('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getAllLesson);

router.get('/simple', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getSimpleLessonList);

router.get('/single', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getSingleLessonDetails);

router.post('/topic', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), addTopice);

router.post('/mapping', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), addMapping);

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
