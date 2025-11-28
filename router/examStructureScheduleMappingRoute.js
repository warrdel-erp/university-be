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

router.patch("/publish", userAuth, publishExamSchedule);

// exam date

router.get("/", userAuth, getAllExamStructureSchedule);

router.post("/schedule", userAuth, addExamSchedule);

router.get("/examType", userAuth, getDetailByExamType);

router.patch("/schedule", userAuth, updateExamSchedule);

router.delete("/schedule", userAuth, deleteExamSchedule);

router.get("/student", userAuth, getExamDetailByStudentId);

export default router;
