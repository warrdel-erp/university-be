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

router.post("/", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE_EXECUTE.value, null), addExamAttendance);

router.get("/", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE.value, null), getAllExamAttendance);

router.get("/single", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE.value, null), getSingleExamAttendance);

router.put("/", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE_EXECUTE.value, null), updateExamAttendances);

router.delete("/", userAuth, checkAccess(PERMISSIONS.EXAM_ATTENDANCE.value, null), deleteExamAttendance);

export default router;
