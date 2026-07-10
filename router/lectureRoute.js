import { Router } from 'express';
import { z } from 'zod';
const router = Router();
import {
    addLectureWindow,
    getLectureWindows,
    getLectureWindowById,
    updateLectureWindow,
    deleteLectureWindow,
    linkLessonsToWindow,
} from "../controllers/lectureWindowController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

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
    employeeId: optionalPositiveId,
    sessionId: positiveIntegerId,
    startDate: dateString,
    endDate: dateString,
    name: z.string().optional(),
    description: z.string().optional(),
}).strict();

const lectureWindowListQuerySchema = z.object({
    subjectId: optionalPositiveId,
    employeeId: optionalPositiveId,
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

const linkLessonsBodySchema = z.object({
    lessonIds: z.array(positiveIntegerId).min(1),
}).strict();

router.post('/', userAuth, validate({ body: lectureWindowBodySchema }), addLectureWindow);

router.get('/', userAuth, validate({ query: lectureWindowListQuerySchema }), getLectureWindows);

router.get('/:lectureWindowId', userAuth, validate({ params: lectureWindowIdParamsSchema }), getLectureWindowById);

router.patch('/:lectureWindowId', userAuth, validate({ params: lectureWindowIdParamsSchema, body: lectureWindowUpdateSchema }), updateLectureWindow);

router.delete('/:lectureWindowId', userAuth, validate({ params: lectureWindowIdParamsSchema }), deleteLectureWindow);

router.post('/:lectureWindowId/lessons', userAuth, validate({ params: lectureWindowIdParamsSchema, body: linkLessonsBodySchema }), linkLessonsToWindow);

export default router;
