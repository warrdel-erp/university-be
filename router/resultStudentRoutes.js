import { Router } from "express";
import { z } from "zod";

const router = Router();

import userAuth from "../middleware/authUser.js";
import { addResultStudent, getStudentResult } from "../controllers/resultStudentsController.js";
import { validate } from "../utility/validation.js";

const getResultSchema = z.object({
    rollNo: z.string({ required_error: "Roll number is required" }).min(1, "Roll number cannot be empty"),
    dob: z.string({ required_error: "Date of birth is required" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
});

router.post("/", userAuth, addResultStudent);
router.get("/getResult", validate({ query: getResultSchema }), getStudentResult);

export default router;
