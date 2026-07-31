import express from "express";
import { z } from "zod";
import useAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";
import {
  createGradingSchema,
  getGradingSchemas,
  getGradingSchemaById,
  updateGradingSchema,
  deleteGradingSchema,
  createGradingSchemaGrade,
  getGradingSchemaGrades,
  getGradingSchemaGradeById,
  updateGradingSchemaGrade,
  deleteGradingSchemaGrade,
  publishGradingSchema,
  saveGradingSchemaDraft,
} from "../controllers/gradingSchemaController.js";

const router = express.Router();

export const gradingGradeSchema = z.object({
  grade: z.string().min(1).max(10),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  gradePoint: z.number().min(0).max(100),
  resultLabel: z.string().min(1).max(100),
  remarks: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int(),
  isPass: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

export const createGradingSchemaBody = z.object({
  universityId: z.number().int().optional(),
  gradingName: z.string().min(1).max(100),
  gradingCode: z.string().min(1).max(20),
  gradingMethod: z.enum(["ABSOLUTE", "RELATIVE"]),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
  isActive: z.boolean().optional().default(true),
});

export const updateGradingSchemaBody = z.object({
  gradingName: z.string().min(1).max(100).optional(),
  gradingCode: z.string().min(1).max(20).optional(),
  gradingMethod: z.enum(["ABSOLUTE", "RELATIVE"]).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isActive: z.boolean().optional(),
});

export const updateGradingSchemaGradeBody = z.object({
  grade: z.string().min(1).max(10).optional(),
  minPercentage: z.number().min(0).max(100).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
  gradePoint: z.number().min(0).max(100).optional(),
  resultLabel: z.string().min(1).max(100).optional(),
  remarks: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isPass: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const listGradingSchemaQuery = z.object({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  gradingMethod: z.enum(["ABSOLUTE", "RELATIVE"]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

// ---------------------------------------------------------------------------
// Grading Schemas Endpoints
// ---------------------------------------------------------------------------
router.post(
  "/",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null),
  validate({ body: createGradingSchemaBody }),
  createGradingSchema
);

router.get(
  "/",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  validate({ query: listGradingSchemaQuery }),
  getGradingSchemas
);

router.get(
  "/:gradingSchemaId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getGradingSchemaById
);

router.put(
  "/:gradingSchemaId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  validate({ body: updateGradingSchemaBody }),
  updateGradingSchema
);

router.delete(
  "/:gradingSchemaId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  deleteGradingSchema
);

// ---------------------------------------------------------------------------
// Grades Endpoints
// ---------------------------------------------------------------------------
router.post(
  "/grades/:gradingSchemaId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null),
  validate({ body: gradingGradeSchema }),
  createGradingSchemaGrade
);

router.get(
  "/grades/:gradingSchemaId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getGradingSchemaGrades
);

router.get(
  "/grades/:gradingSchemaGradeId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getGradingSchemaGradeById
);

router.put(
  "/grades/:gradingSchemaGradeId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  validate({ body: updateGradingSchemaGradeBody }),
  updateGradingSchemaGrade
);

router.delete(
  "/grades/:gradingSchemaGradeId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  deleteGradingSchemaGrade
);

// ---------------------------------------------------------------------------
// Schema Status Endpoints (Publish / Draft)
// ---------------------------------------------------------------------------
router.post(
  "/publish/:gradingSchemaId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  publishGradingSchema
);

router.post(
  "/draft/:gradingSchemaId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  saveGradingSchemaDraft
);

export default router;
