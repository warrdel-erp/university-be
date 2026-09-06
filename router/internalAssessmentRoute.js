import { Router } from "express";
import { z } from "zod";
import {} from "../controllers/internalAssessmentController.js";
const router = Router();
router.post("/", validate(z.object({})));
export default router;
