import { Router } from "express";
const router = Router();
import {
    addExamStructureSchedule,
    getAllExamStructureSchedule,
    publishExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    addExamSchedule, getDetailByExamType, getExamDetailByStudentId, getExamScheduleById
} from "../controllers/examStructureScheduleMappingController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/", userAuth, addExamStructureSchedule);

router.patch("/publish", userAuth, publishExamSchedule);

router.get("/getScheduleById/:id", userAuth, getExamScheduleById);

// exam date

router.get("/", userAuth, getAllExamStructureSchedule);

router.post("/schedule", userAuth, checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ADD.value, null), addExamSchedule);

router.get("/examType", userAuth, getDetailByExamType);

router.patch("/schedule", userAuth, checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ADD.value, null), updateExamSchedule);

router.delete("/schedule", userAuth, checkAccess(PERMISSIONS.EXAM_TIME_TABLE_CREATE_ADD.value, null), deleteExamSchedule);

router.get("/student", userAuth, getExamDetailByStudentId);

export default router;
