import { Router } from "express";
const router = Router();
import {
    addExamStructureSchedule,
    getAllExamStructureSchedule,
    getSingleExamStructureSchedule,
    updateExamStructureSchedule,
    deleteExamStructureSchedule,
    addExamType,getDetailByExamType
} from "../controllers/examStructureScheduleMappingController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addExamStructureSchedule);

router.get("/", userAuth, getAllExamStructureSchedule);

router.get("/single", userAuth, getSingleExamStructureSchedule);

router.patch("/", userAuth, updateExamStructureSchedule);

router.delete("/", userAuth, deleteExamStructureSchedule);

router.post("/examType", userAuth, addExamType);

router.get("/examType", userAuth, getDetailByExamType);

export default router;
