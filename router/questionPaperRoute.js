import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
    addQuestionPaper,
    getAllQuestionPapers,
    getSingleQuestionPaper,
    updateQuestionPaper,
    deleteQuestionPaper,
} from "../controllers/questionPaperController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const createQuestionPaperSchema = z.object({
    questionPaper: z.any({ required_error: "questionPaper data is required" }),
    examScheduleId: z.number({ required_error: "examScheduleId is required" }),
});

const getAllQuestionPapersQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional().default("1"),
    limit: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional().default("10"),
    examScheduleId: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional(),
    createdBy: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional(),
});

const updateQuestionPaperSchema = z.object({
    id: z.number({ required_error: "id is required" }),
    questionPaper: z.any(),
});


router.post("/", userAuth, validate({ body: createQuestionPaperSchema }), addQuestionPaper);

router.get("/", userAuth, validate({ query: getAllQuestionPapersQuerySchema }), getAllQuestionPapers);

router.get("/:id", userAuth, getSingleQuestionPaper);

router.put("/", userAuth, validate({ body: updateQuestionPaperSchema }), updateQuestionPaper);

router.delete("/:id", userAuth, deleteQuestionPaper);

export default router; 