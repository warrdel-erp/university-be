import { Router } from 'express'
const router = Router();
import { addSession, getAllSession, getSingleSessionDetails, updateSession, deleteSession, couseSessionMapping, updateCouseSessionMapping, deleteCouseSessionMapping } from "../controllers/sessionController.js";
import userAuth from "../middleware/authUser.js"
import { z } from 'zod';
import { validate } from '../utility/validation.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

const sessionSchema = z.object({
    sessionName: z.string({ required_error: "Session name is required" }).min(1, "Session name cannot be empty"),
    startingDate: z.string({ required_error: "Starting date is required" }),
    endingDate: z.string({ required_error: "Ending date is required" }),
    classTillDate: z.string({ required_error: "Class till date is required" }),
});

const updateSessionSchema = sessionSchema.partial().extend({
    sessionId: z.coerce.number().int().positive(),
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

router.post('/', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP_ADD.value, 'session'), validate({ body: sessionSchema }), addSession);

router.get('/', userAuth, getAllSession);

router.get('/single', userAuth, getSingleSessionDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP_EDIT.value, 'session'), validate({ body: updateSessionSchema }), updateSession);

router.delete('/', userAuth, checkAccess(PERMISSIONS.SESSION_SETUP_DELETE.value, 'session'), deleteSession);

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

export default router; 