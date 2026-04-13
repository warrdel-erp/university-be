import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
    addQuestionPaper,
    getAllQuestionPapers,
    getSingleQuestionPaper,
    updateQuestionPaper,
    deleteQuestionPaper,
    generateQuestionPaper,
    approveQuestionPaper,
} from "../controllers/questionPaperController.js";

import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { questionTypes } from "../constant.js";

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
    id: z.number().optional(), // Include ID optionally as they come from the bank
    difficulty: z.string({ required_error: "difficulty is required" }),
    bloom: z.string({ required_error: "bloom is required" }),
    marks: z.number({ required_error: "marks is required" }),
    question: z.string({ required_error: "question is required" }),
    Answer: z.string({ required_error: "Answer is required" }),
    subjectId: z.number().optional(),
    status: z.string().optional(),
    universityId: z.number().optional(),
    createdBy: z.number().optional(),
    updatedBy: z.number().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
});

const questionSchema = z.discriminatedUnion("type", [
    baseQuestionSchema.merge(mcqSchema),
    baseQuestionSchema.merge(theorySchema),
    baseQuestionSchema.merge(theoryChoiceSchema),
]);

const questionPaperSectionSchema = z.object({
    sectionName: z.string({ required_error: "sectionName is required" }),
    typeOfQuestions: z.enum(Object.values(questionTypes), { required_error: "typeOfQuestions is required" }),
    marksPerQuestion: z.number({ required_error: "marksPerQuestion is required" }),
    questions: z.array(questionSchema, { required_error: "questions array is required" }).min(1, "At least one question is required"),
});

const createQuestionPaperSchema = z.object({
    name: z.string({ required_error: "name is required" }),
    questionPaper: z.array(questionPaperSectionSchema).min(1, "Question paper must have at least one section"),
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
    name: z.string().optional(),
    questionPaper: z.array(questionPaperSectionSchema).min(1, "Question paper must have at least one section").optional(),
});

const generateQuestionPaperSchema = z.object({
    name: z.string({ required_error: "name is required" }),
    blueprintId: z.number({ required_error: "blueprintId is required" }),
    examScheduleId: z.number({ required_error: "examScheduleId is required" }),
    numberOfPapers: z.number().int().min(1).max(50).optional().default(1),
});

const approveQuestionPaperSchema = z.object({
    id: z.number({ required_error: "id is required" }),
});


router.post("/", userAuth, validate({ body: createQuestionPaperSchema }), addQuestionPaper);

router.post("/generate", userAuth, validate({ body: generateQuestionPaperSchema }), generateQuestionPaper);

router.get("/", userAuth, validate({ query: getAllQuestionPapersQuerySchema }), getAllQuestionPapers);

router.get("/:id", userAuth, getSingleQuestionPaper);

router.put("/", userAuth, validate({ body: updateQuestionPaperSchema }), updateQuestionPaper);

router.delete("/:id", userAuth, deleteQuestionPaper);

router.put("/approve", userAuth, validate({ body: approveQuestionPaperSchema }), approveQuestionPaper);

export default router;