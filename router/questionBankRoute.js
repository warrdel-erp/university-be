import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
    addQuestion,
    getAllQuestions,
    getSingleQuestion,
    updateQuestion,
    deleteQuestion,
} from "../controllers/questionBankController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const createQuestionSchema = z.object({
    type: z.string({ required_error: "type is required" }),
    difficulty: z.string({ required_error: "difficulty is required" }),
    bloom: z.string({ required_error: "bloom is required" }),
    marks: z.number({ required_error: "marks is required" }),
    question: z.string({ required_error: "question is required" }),
    Answer: z.string({ required_error: "Answer is required" }),
});

const updateQuestionSchema = z.object({
    id: z.number({ required_error: "id is required" }),
    type: z.string().optional(),
    difficulty: z.string().optional(),
    bloom: z.string().optional(),
    marks: z.number().optional(),
    question: z.string().optional(),
    Answer: z.string().optional(),
});


router.post("/", userAuth, validate({ body: createQuestionSchema }), addQuestion);

router.get("/", userAuth, getAllQuestions);

router.get("/:id", userAuth, getSingleQuestion);

router.put("/", userAuth, validate({ body: updateQuestionSchema }), updateQuestion);

router.delete("/:id", userAuth, deleteQuestion);

export default router;
