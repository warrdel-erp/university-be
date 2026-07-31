import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { ASSESSMENT_CATEGORIES } from "../constant.js";
import {
  addExamType,
  getDetailByExamType,
  getSingleExamType,
  updateExamType,
  deleteExamType,
} from "../controllers/examStructureController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerId = z.coerce.number().int().positive();

const getDetailByExamTypeQuerySchema = z.object({
  examSetupTypeId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  courseId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  sessionId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  termNumber: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
});

const getallExamTypeQuerySchema = z.object({
  courseId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  sessionId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  termNumber: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
});

const addExamTypeSchema = z.object({
  examName: z.string().optional().nullable(),
  examCode: z.string().optional().nullable(),
  examCategory: z.enum(ASSESSMENT_CATEGORIES).optional().nullable(),
  examSubcategory: z.string().optional().nullable(),
  examDescription: z.string().max(500).optional().nullable(),
  courseId: z.coerce.number().int().positive().optional().nullable(),
  sessionId: z.coerce.number().int().positive().optional().nullable(),
});

const updateExamTypeSchema = z.object({
  examSetupTypeId: z.coerce.number().int().positive({ message: "examSetupTypeId is required" }),
  examName: z.string().optional().nullable(),
  examCode: z.string().optional().nullable(),
  examCategory: z.enum(ASSESSMENT_CATEGORIES).optional().nullable(),
  examSubcategory: z.string().optional().nullable(),
  examDescription: z.string().max(500).optional().nullable(),
  courseId: z.coerce.number().int().positive().optional().nullable(),
  sessionId: z.coerce.number().int().positive().optional().nullable(),
});

//Table of examType
router.post("/examType", userAuth, validate({ body: addExamTypeSchema }), addExamType);

router.get("/examType", userAuth, validate({ query: getDetailByExamTypeQuerySchema }), getDetailByExamType);

router.get("/examType/all", userAuth, validate({ query: getallExamTypeQuerySchema }), getSingleExamType);

router.patch("/examType", userAuth, validate({ body: updateExamTypeSchema }), updateExamType);

router.delete("/examType/:examSetupTypeId", userAuth, deleteExamType);

export default router;
