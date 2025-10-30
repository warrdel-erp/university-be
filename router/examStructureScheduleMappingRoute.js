import { Router } from "express";
const router = Router();
import {
    addExamStructureSchedule,
    getAllExamStructureSchedule,
    getSingleExamStructureSchedule,
    updateExamStructureSchedule,
    deleteExamStructureSchedule,
    addExamSchedule,getDetailByExamType
} from "../controllers/examStructureScheduleMappingController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addExamStructureSchedule);

router.get("/", userAuth, getAllExamStructureSchedule);

router.get("/single", userAuth, getSingleExamStructureSchedule);

router.patch("/", userAuth, updateExamStructureSchedule);

router.delete("/", userAuth, deleteExamStructureSchedule);

router.post("/schedule", userAuth, addExamSchedule);

router.get("/examType", userAuth, getDetailByExamType);

export default router;
