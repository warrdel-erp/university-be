import { Router } from 'express'
const router = Router();
import { addSession, getAllSession, getSingleSessionDetails, updateSession, deleteSession, couseSessionMapping, updateCouseSessionMapping, deleteCouseSessionMapping } from "../controllers/sessionController.js";
import * as batchController from "../controllers/batchController.js";
import userAuth from "../middleware/authUser.js"
import { z } from 'zod';
import { validate } from '../utility/validation.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';


const createBatchSchema = z.object({
    sessionId: z.coerce.number().int().positive(),
    batch: z.coerce.number().int().min(1900).max(2100),
    intakeCapacity: z.coerce.number().int().positive().optional().nullable(),
});

const updateBatchSchema = z.object({
    intakeCapacity: z.coerce.number().int().positive().optional().nullable(),
}).refine((d) => d.intakeCapacity !== undefined, {
    message: 'intakeCapacity is required',
});

const batchIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const sessionSchema = z.object({
    sessionName: z.string({ required_error: "Session name is required" }).min(1, "Session name cannot be empty"),

    courseId: z.coerce.number({ required_error: "Course ID is required" }).int().positive(),
});

const updateSessionSchema = sessionSchema.omit({ courseId: true }).partial().extend({
    sessionId: z.coerce.number().int().positive(),
    courseId: z.any().optional().refine(val => val === undefined, { message: "Program of a session cannot be edited" }),
});

const deleteCourseSessionMappingSchema = z.object({
    sessionCourseMappingId: z.coerce.number({
        required_error: "sessionCourseMappingId is required",
        invalid_type_error: "sessionCourseMappingId must be a number",
    }),
});

const courseSessionMappingSchema = z.object({
    sessionId: z.coerce.number().int().positive(),
    courseId: z.union([
        z.array(z.coerce.number().int().positive()).min(1),
        z.coerce.number().int().positive(),
    ]),
});

const updateCourseSessionMappingSchema = z.object({
    sessionCourseMappingId: z.coerce.number().int().positive(),
    sessionId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
});

router.post('/', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP_ADD.value), validate({ body: sessionSchema }), addSession);

router.get('/', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP.value), getAllSession);

router.get('/single', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP.value), getSingleSessionDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP_EDIT.value), validate({ body: updateSessionSchema }), updateSession);

router.delete('/', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP_DELETE.value), deleteSession);

router.post(
    '/courseSessionMapping',
    userAuth,
    checkAccess(PERMISSIONS.SESSION_SETUP_ADD.value, 'sessionCourseMapping'),
    validate({ body: courseSessionMappingSchema }),
    couseSessionMapping
);

router.patch(
    '/courseSessionMapping/update',
    userAuth,
    checkAccess(PERMISSIONS.SESSION_SETUP_EDIT.value, 'sessionCourseMapping'),
    validate({ body: updateCourseSessionMappingSchema }),
    updateCouseSessionMapping
);

router.delete('/courseSessionMapping', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP_DELETE.value, 'sessionCourseMapping'), validate({ query: deleteCourseSessionMappingSchema }), deleteCouseSessionMapping);

// ── Batch CRUD ────────────────────────────────────────────────────────────────
// GET  /session/batches             — list all sessions with their batches
// POST /session/batches             — create a new batch (starts as draft)
// GET  /session/batches/:id         — single batch detail
// GET  /session/batches/:id/details — full batch setup (course/session/curriculum/regulations/APSMs)
// PATCH /session/batches/:id        — update (draft only: intakeCapacity)
// PATCH /session/batches/:id/publish — publish a batch (draft → published)
// DELETE /session/batches/:id       — delete a batch (draft only)

router.get('/batches', userAuth, batchController.getAllBatches);
router.post('/batches', userAuth, validate({ body: createBatchSchema }), batchController.createBatch);
router.get('/batches/:id/details', userAuth, validate({ params: batchIdParamSchema }), batchController.getBatchFullDetails);
router.get('/batches/:id', userAuth, validate({ params: batchIdParamSchema }), batchController.getBatch);
router.patch('/batches/:id/publish', userAuth, validate({ params: batchIdParamSchema }), batchController.publishBatch);
router.patch('/batches/:id', userAuth, validate({ params: batchIdParamSchema, body: updateBatchSchema }), batchController.updateBatch);
router.delete('/batches/:id', userAuth, validate({ params: batchIdParamSchema }), batchController.deleteBatch);

export default router;