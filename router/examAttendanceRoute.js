import { Router } from "express";
const router = Router();
import {
    getExamOperationsAttendance,
    getExamOperationsAttendanceRoom,
    markExamAttendance,
    updateRoomAttendanceStatus,
    getExamAttendanceDetails,
    getExamOperationsSummary,
    generateRoomAttendance
} from "../controllers/examAttendanceController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { z } from "zod";

const querySchema = z.object({
    examinationSessionId: z.coerce.number().int().positive(),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD").optional(),
    examinationSessionSlotId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    term: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(10)
});

const roomQuerySchema = z.object({
    examScheduleId: z.coerce.number().int().positive(),
    examScheduleRoomCapacityId: z.coerce.number().int().positive()
});

const markAttendanceSchema = z.object({
    examScheduleId: z.number().int().positive(),
    examScheduleRoomCapacityId: z.number().int().positive(),
    students: z.array(z.object({
        studentId: z.number().int().positive(),
        attendanceStatus: z.enum(["PRESENT", "ABSENT", "PENDING"])
    })).min(1, "At least one student is required")
});

const updateRoomStatusSchema = z.object({
    examScheduleId: z.number().int().positive(),
    examScheduleRoomCapacityId: z.number().int().positive(),
    status: z.enum(["NOT_GENERATED", "GENERATED", "IN_PROGRESS", "SUBMITTED", "VERIFIED"])
});

const getDetailsParamsSchema = z.object({
    examScheduleId: z.string().regex(/^\d+$/).transform(Number)
});

const getSummarySchema = z.object({
    query: z.object({
        examinationSessionId: z.coerce.number().int().positive(),
        courseId: z.coerce.number().int().positive().optional(),
        sessionId: z.coerce.number().int().positive().optional(),
        term: z.coerce.number().int().positive().optional(),
        examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD").optional(),
        examinationSessionSlotId: z.coerce.number().int().positive().optional()
    })
});

const generateAttendanceSchema = z.object({
    examScheduleId: z.coerce.number().int().positive().optional(),
    examScheduleRoomCapacityId: z.coerce.number().int().positive().optional()
});

router.get("/", userAuth, validate({ query: querySchema }), getExamOperationsAttendance);
router.get("/room", userAuth, validate({ query: roomQuerySchema }), getExamOperationsAttendanceRoom);
router.post("/room", userAuth, validate({ query: generateAttendanceSchema, body: generateAttendanceSchema }), generateRoomAttendance);
router.get("/summary", userAuth, validate(getSummarySchema), getExamOperationsSummary);
router.get("/:examScheduleId", userAuth, validate({ params: getDetailsParamsSchema }), getExamAttendanceDetails);
router.patch("/", userAuth, validate({ body: markAttendanceSchema }), markExamAttendance);
router.post("/status", userAuth, validate({ body: updateRoomStatusSchema }), updateRoomAttendanceStatus);

export default router;
