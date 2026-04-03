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
import { questionStatus, questionTypes } from "../constant.js";

const mcqSchema = z.object({
    type: z.literal(questionTypes.MCQ),
    content: z.object({
        options: z.array(z.string()).min(2, "MCQ must have at least 2 options"),
    }),
});

const theorySchema = z.object({
    type: z.literal(questionTypes.THEORY),
    content: z.union([z.null(), z.object({}).optional()]),
});

const theoryChoiceSchema = z.object({
    type: z.literal(questionTypes.THEORY_CHOICE),
    content: z.object({
        options: z.array(z.object({
            question: z.string(),
            Answer: z.string(),
        })).min(1, "At least one optional question is required"),
        mandatoryCount: z.number().min(1, "Mandatory count must be at least 1"),
    }),
});

const baseQuestionSchema = z.object({
    difficulty: z.string({ required_error: "difficulty is required" }),
    bloom: z.string({ required_error: "bloom is required" }),
    marks: z.number({ required_error: "marks is required" }),
    question: z.string({ required_error: "question is required" }),
    Answer: z.string({ required_error: "Answer is required" }),
    subjectId: z.number(),
});

const createQuestionSchema = z.discriminatedUnion("type", [
    baseQuestionSchema.merge(mcqSchema),
    baseQuestionSchema.merge(theorySchema),
    baseQuestionSchema.merge(theoryChoiceSchema),
]);

const getAllQuestionsQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional().default("1"),
    limit: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional().default("10"),
    type: z.enum(Object.values(questionTypes)).optional(),
    difficulty: z.string().optional(),
    bloom: z.string().optional(),
    marks: z.string().regex(/^\d+$/).transform(val => parseInt(val)).optional(),
    createdBy: z.coerce.number().optional(),
    subjectId: z.coerce.number().optional(),
    status: z.enum(questionStatus).optional(),
});

const bulkActionSchema = z.object({
    ids: z.array(z.number()).min(1, "At least one ID is required"),
});

const updateQuestionSchema = z.object({
    id: z.number({ required_error: "id is required" }),
    difficulty: z.string().optional(),
    bloom: z.string().optional(),
    marks: z.number().optional(),
    question: z.string().optional(),
    Answer: z.string().optional(),
    subjectId: z.number().optional(),
}).and(z.union([
    z.object({
        type: z.literal(questionTypes.MCQ),
        content: mcqSchema.shape.content
    }),
    z.object({
        type: z.literal(questionTypes.THEORY),
        content: theorySchema.shape.content
    }),
    z.object({
        type: z.literal(questionTypes.THEORY_CHOICE),
        content: theoryChoiceSchema.shape.content
    }),
    z.object({
        type: z.undefined(),
        content: z.any().optional()
    })
]).optional());


router.post("/", userAuth, validate({ body: createQuestionSchema }), addQuestion);

router.get("/", userAuth, validate({ query: getAllQuestionsQuerySchema }), getAllQuestions);

router.get("/count", userAuth, validate({ query: getAllQuestionsQuerySchema }), countQuestions);

router.get("/:id", userAuth, getSingleQuestion);

router.put("/bulkApprove", userAuth, validate({ body: bulkActionSchema }), bulkApprove);

router.put("/bulkReject", userAuth, validate({ body: bulkActionSchema }), bulkReject);

router.put("/", userAuth, validate({ body: updateQuestionSchema }), updateQuestion);

router.delete("/:id", userAuth, deleteQuestion);

export default router;
