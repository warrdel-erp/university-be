import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
    addQuestion,
    getAllQuestions,
    countQuestions,
    bulkApprove,
    bulkReject,
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
    subjectId: z.number().optional(),
});

const getAllQuestionsQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional().default("1"),
    limit: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional().default("10"),
    type: z.string().optional(),
    difficulty: z.string().optional(),
    bloom: z.string().optional(),
    marks: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional(),
    createdBy: z.coerce.number().optional(),
    subjectId: z.coerce.number().optional(),
    status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
});

const bulkActionSchema = z.object({
    ids: z.array(z.number()).min(1, "At least one ID is required"),
});

const updateQuestionSchema = z.object({
    id: z.number({ required_error: "id is required" }),
    type: z.string().optional(),
    difficulty: z.string().optional(),
    bloom: z.string().optional(),
    marks: z.number().optional(),
    question: z.string().optional(),
    Answer: z.string().optional(),
    subjectId: z.number().optional(),
});


router.post("/", userAuth, validate({ body: createQuestionSchema }), addQuestion);

router.get("/", userAuth, validate({ query: getAllQuestionsQuerySchema }), getAllQuestions);

router.get("/count", userAuth, validate({ query: getAllQuestionsQuerySchema }), countQuestions);

router.get("/:id", userAuth, getSingleQuestion);

router.put("/bulkApprove", userAuth, validate({ body: bulkActionSchema }), bulkApprove);

router.put("/bulkReject", userAuth, validate({ body: bulkActionSchema }), bulkReject);

router.put("/", userAuth, validate({ body: updateQuestionSchema }), updateQuestion);

router.delete("/:id", userAuth, deleteQuestion);

export default router;
