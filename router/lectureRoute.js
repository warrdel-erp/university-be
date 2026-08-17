import { Router } from 'express';
import { z } from 'zod';
const router = Router();
import {
    addLectureWindow,
    getLectureWindows,
    getMyLectureWindows,
    getLectureWindowById,
    updateLectureWindow,
    deleteLectureWindow,
} from "../controllers/lectureWindowController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const optionalPositiveId = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    z.coerce.number().int().positive().optional(),
);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

const lectureWindowBodySchema = z.object({
    subjectId: positiveIntegerId,
    userId: optionalPositiveId,
    sessionId: positiveIntegerId,
    startDate: dateString,
    endDate: dateString,
    name: z.string().optional(),
    description: z.string().optional(),
}).strict();

const lectureWindowListQuerySchema = z.object({
    subjectId: optionalPositiveId,
    userId: optionalPositiveId,
    sessionId: optionalPositiveId,
    lessonId: optionalPositiveId,
}).strict();

const getMyLectureWindowListQuerySchema = z.object({
    subjectId: optionalPositiveId,
    sessionId: optionalPositiveId,
    lessonId: optionalPositiveId,
}).strict();

const lectureWindowIdParamsSchema = z.object({
    lectureWindowId: positiveIntegerId,
});

const lectureWindowUpdateSchema = z.object({
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    lessonIds: z.array(positiveIntegerId).optional(),
}).strict();

router.post('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), validate({ body: lectureWindowBodySchema }), addLectureWindow);

router.get('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), validate({ query: lectureWindowListQuerySchema }), getLectureWindows);

router.get('/my', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), validate({ query: getMyLectureWindowListQuerySchema }), getMyLectureWindows);

router.get('/:lectureWindowId', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), validate({ params: lectureWindowIdParamsSchema }), getLectureWindowById);

router.patch('/:lectureWindowId', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_EDIT.value, null), validate({ params: lectureWindowIdParamsSchema, body: lectureWindowUpdateSchema }), updateLectureWindow);

router.delete('/:lectureWindowId', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_DELETE.value, null), validate({ params: lectureWindowIdParamsSchema }), deleteLectureWindow);

export default router;
