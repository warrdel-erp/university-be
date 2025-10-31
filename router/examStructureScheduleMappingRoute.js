import { Router } from "express";
const router = Router();
import {
    addExamStructureSchedule,
    getAllExamStructureSchedule,
    publishExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    addExamSchedule,getDetailByExamType,getExamDetailByStudentId
} from "../controllers/examStructureScheduleMappingController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addExamStructureSchedule);

router.get("/", userAuth, getAllExamStructureSchedule);

router.patch("/publish", userAuth, publishExamSchedule);

router.patch("/schedule", userAuth, updateExamSchedule);

router.delete("/schedule", userAuth, deleteExamSchedule);

router.post("/schedule", userAuth, addExamSchedule);

router.get("/examType", userAuth, getDetailByExamType);

router.get("/student", userAuth, getExamDetailByStudentId);

export default router;
