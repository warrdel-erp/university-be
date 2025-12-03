import { Router } from "express";
const router = Router();
import {
    addInternalAssessment,
    getAllInternalAssessment,
    getSingleInternalAssessment,
    updateInternalAssessments,
    deleteInternalAssessment,evaluationInternalAssessment,createAssessmentEvaluation,updateAssessmentEvaluation
} from "../controllers/internalAssessmentController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addInternalAssessment);

router.get("/", userAuth, getAllInternalAssessment);

router.get("/single", userAuth, getSingleInternalAssessment);

router.patch("/", userAuth, updateInternalAssessments);

router.delete("/", userAuth, deleteInternalAssessment);

router.get("/evaluation", userAuth, evaluationInternalAssessment);

router.post("/evaluation", userAuth, createAssessmentEvaluation);

router.patch("/evaluation", userAuth, updateAssessmentEvaluation);

export default router;