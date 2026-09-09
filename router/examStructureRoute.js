import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { ASSESSMENT_CATEGORIES, EXAM_MANAGED_BY } from "../constant.js";
import {
  addExamType,
  getDetailByExamType,
  getAllExamTypes,
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
  termNumber: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

const getallExamTypeQuerySchema = z.object({
  termNumber: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

const requireManagedByUnlessContinuous = (data, ctx) => {
  if (data.examCategory === "CONTINUOUS_ASSESSMENT") {
    return;
  }
  if (!data.managedBy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "managedBy is required when examCategory is not CONTINUOUS_ASSESSMENT",
      path: ["managedBy"],
    });
  }
};

const addExamTypeSchema = z
  .object({
    examName: z.string().optional().nullable(),
    examCode: z.string().optional().nullable(),
    examCategory: z.enum(ASSESSMENT_CATEGORIES).optional().nullable(),
    examSubcategory: z.string().optional().nullable(),
    examDescription: z.string().max(500).optional().nullable(),
    managedBy: z.enum(EXAM_MANAGED_BY).optional(),
  })
  .superRefine(requireManagedByUnlessContinuous);

const updateExamTypeSchema = z
  .object({
    examSetupTypeId: z.coerce.number().int().positive({ message: "examSetupTypeId is required" }),
    examName: z.string().optional().nullable(),
    examCode: z.string().optional().nullable(),
    examCategory: z.enum(ASSESSMENT_CATEGORIES).optional().nullable(),
    examSubcategory: z.string().optional().nullable(),
    examDescription: z.string().max(500).optional().nullable(),
    managedBy: z.enum(EXAM_MANAGED_BY).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.examCategory === "CONTINUOUS_ASSESSMENT") {
      return;
    }
    if (data.examCategory != null && !data.managedBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "managedBy is required when examCategory is not CONTINUOUS_ASSESSMENT",
        path: ["managedBy"],
      });
    }
  });

//Table of examType
router.post("/examType", userAuth, validate({ body: addExamTypeSchema }), addExamType);

router.get("/examType", userAuth, validate({ query: getDetailByExamTypeQuerySchema }), getDetailByExamType);

router.get("/examType/single", userAuth, validate({ query: getDetailByExamTypeQuerySchema }), getDetailByExamType);

router.get("/examType/all", userAuth, validate({ query: getallExamTypeQuerySchema }), getAllExamTypes);

router.patch("/examType", userAuth, validate({ body: updateExamTypeSchema }), updateExamType);

router.delete("/examType/:examSetupTypeId", userAuth, deleteExamType);

export default router;
