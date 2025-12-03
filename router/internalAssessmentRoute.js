import { Router } from "express";
const router = Router();
import {
    addInternalAssessment,
    getAllInternalAssessment,
    getSingleInternalAssessment,
    updateInternalAssessments,
    deleteInternalAssessment,
} from "../controllers/internalAssessmentController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addInternalAssessment);

router.get("/", userAuth, getAllInternalAssessment);

router.get("/single", userAuth, getSingleInternalAssessment);

router.patch("/", userAuth, updateInternalAssessments);

router.delete("/", userAuth, deleteInternalAssessment);

export default router;