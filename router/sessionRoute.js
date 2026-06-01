import { Router } from 'express'
const router = Router();
import { addSession, getAllSession, getSingleSessionDetails, updateSession, deleteSession, couseSessionMapping, updateCouseSessionMapping, deleteCouseSessionMapping } from "../controllers/sessionController.js";
import userAuth from "../middleware/authUser.js"
import { z } from 'zod';
import { validate } from '../utility/validation.js';

const sessionSchema = z.object({
    sessionName: z.string({ required_error: "Session name is required" }).min(1, "Session name cannot be empty"),
    startingDate: z.string({ required_error: "Starting date is required" }),
    endingDate: z.string({ required_error: "Ending date is required" }),
    classTillDate: z.string({ required_error: "Class till date is required" }),
    acedmicYearId: z.number({ required_error: "Academic year id is required" }),
    courseId: z.array(z.number()).optional()
});

const deleteCourseSessionMappingSchema = z.object({
    sessionCourseMappingId: z.coerce.number({
        required_error: "sessionCourseMappingId is required",
        invalid_type_error: "sessionCourseMappingId must be a number",
    }),
});

router.post('/', userAuth, validate({ body: sessionSchema }), addSession);

router.get('/', userAuth, getAllSession);

router.get('/single', userAuth, getSingleSessionDetails);

router.patch('/', userAuth, updateSession);

router.delete('/', userAuth, deleteSession);

router.post('/courseSessionMapping', userAuth, couseSessionMapping);

router.patch('/courseSessionMapping/update', userAuth, updateCouseSessionMapping);

router.delete('/courseSessionMapping', userAuth, validate({ query: deleteCourseSessionMappingSchema }), deleteCouseSessionMapping);

export default router; 