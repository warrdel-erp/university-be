import { Router } from "express";
const router = Router();
import {
    addExamSetup,
    getAllExamSetup,
    getSingleExamSetup,
    updateExamSetup,
    deleteExamSetup,
} from "../controllers/examSetupController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addExamSetup);

router.get("/", userAuth, getAllExamSetup);

router.get("/single", userAuth, getSingleExamSetup);

router.patch("/", userAuth, updateExamSetup);

router.delete("/", userAuth, deleteExamSetup);

export default router;
