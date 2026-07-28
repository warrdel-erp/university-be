import { Router } from "express";
const router = Router();
import {
    addExamAttendance,
    getAllExamAttendance,
    getSingleExamAttendance,
    deleteExamAttendance,
    updateExamAttendances
} from "../controllers/examAttendanceController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";
import { z } from "zod";

const optionalAcademicYearIdQuerySchema = z.object({
    academicYearId: z.coerce.number().int().positive().optional(),
});

const examAttendanceIdQuerySchema = z.object({
    examAttendanceId: z.coerce.number().int().positive(),
});

router.post("/", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE_EXECUTE.value, null), addExamAttendance);

router.get(
    "/",
    userAuth,
    checkAccess(PERMISSIONS.EXAM_ATTENDANCE.value, null),
    validate({ query: optionalAcademicYearIdQuerySchema }),
    getAllExamAttendance,
);

router.get(
    "/single",
    userAuth,
    checkAccess(PERMISSIONS.EXAM_ATTENDANCE.value, null),
    validate({ query: examAttendanceIdQuerySchema }),
    getSingleExamAttendance,
);

router.put("/", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE_EXECUTE.value, null), updateExamAttendances);

router.delete("/", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE.value, null), deleteExamAttendance);

export default router;
