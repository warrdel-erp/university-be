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

router.post("/", userAuth, addExamAttendance);

router.get("/", userAuth, getAllExamAttendance);

router.get("/single", userAuth, getSingleExamAttendance);

router.put("/", userAuth, updateExamAttendances);

router.delete("/", userAuth, deleteExamAttendance);

export default router;
