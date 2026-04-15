import { Router } from "express";
const router = Router();
import {
    addExamStructure,
    getAllExamStructure,
    getSingleExamStructure,
    updateExamStructure,
    deleteExamStructure,
    addExamType, getDetailByExamType, getSingleExamType, updateExamType, deleteExamType
} from "../controllers/examStructureController.js";
import userAuth from "../middleware/authUser.js";

router.post("/examRule", userAuth, addExamStructure);

router.get("/examRule", userAuth, getAllExamStructure);

router.get("/examRule/single", userAuth, getSingleExamStructure);

router.patch("/examRule", userAuth, updateExamStructure);

router.delete("/examRule", userAuth, deleteExamStructure);

router.post("/examType", userAuth, addExamType);

router.get("/examType", userAuth, getDetailByExamType);

router.get("/examType/single", userAuth, getSingleExamType);

router.patch("/examType", userAuth, updateExamType);

router.delete("/examType/:examSetupTypeId", userAuth, deleteExamType);

export default router;
