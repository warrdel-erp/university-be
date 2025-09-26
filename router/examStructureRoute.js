import { Router } from "express";
const router = Router();
import {
    addExamStructure,
    getAllExamStructure,
    getSingleExamStructure,
    updateExamStructure,
    deleteExamStructure,
    addExamType,
} from "../controllers/examStructureController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addExamStructure);

router.get("/", userAuth, getAllExamStructure);

router.get("/single", userAuth, getSingleExamStructure);

router.patch("/", userAuth, updateExamStructure);

router.delete("/", userAuth, deleteExamStructure);

router.post("/examType", userAuth, addExamType);

export default router;
