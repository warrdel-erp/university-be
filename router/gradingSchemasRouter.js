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

const emptyStringToNull = (val) => (val === "" || val === undefined ? null : val);
const coerceBoolean = (val) => (val === "true" || val === 1 || val === "1" ? true : val === "false" || val === 0 || val === "0" ? false : val);

export const gradingGradeSchema = z.object({
  gradingGradeId: z.preprocess(emptyStringToNull, z.coerce.number().int().optional().nullable()),
  gradingId: z.preprocess(emptyStringToNull, z.coerce.number().int().optional().nullable()),
  grade: z.string().min(1).max(10),
  minPercentage: z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(100).optional().nullable()),
  maxPercentage: z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(100).optional().nullable()),
  lowerBound: z.preprocess(emptyStringToNull, z.coerce.number().optional().nullable()),
  upperBound: z.preprocess(emptyStringToNull, z.coerce.number().optional().nullable()),
  expectedStudentsPercentage: z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(100).optional().nullable()),
  isRuleBased: z.preprocess(coerceBoolean, z.boolean().optional().default(false)),
  gradePoint: z.coerce.number().min(0).max(100),
  resultLabel: z.string().min(1).max(100),
  remarks: z.preprocess(emptyStringToNull, z.string().max(255).optional().nullable()),
  sortOrder: z.coerce.number().int(),
  isPass: z.preprocess(coerceBoolean, z.boolean().optional().default(true)),
  isActive: z.preprocess(coerceBoolean, z.boolean().optional().default(true)),
}).passthrough();

export const createGradingSchemaBody = z.object({
  universityId: z.preprocess(emptyStringToNull, z.coerce.number().int().optional().nullable()),
  gradingName: z.string().min(1).max(100),
  gradingCode: z.string().min(1).max(20),
  gradingMethod: z.enum(["ABSOLUTE", "RELATIVE"]),
  distributionMethod: z.preprocess(
    emptyStringToNull,
    z.enum(["PERCENTILE", "BELL_CURVE", "Z_SCORE", "MANUAL_DISTRIBUTION"]).optional().nullable()
  ),
  relativeConfig: z.preprocess(
    emptyStringToNull,
    z.union([z.record(z.string(), z.any()), z.null()]).optional()
  ),
  maximumMarks: z.preprocess(
    emptyStringToNull,
    z.coerce.number().positive().optional().nullable()
  ),
  minimumPassingMarks: z.preprocess(
    emptyStringToNull,
    z.coerce.number().min(0).optional().nullable()
  ),
  description: z.preprocess(
    emptyStringToNull,
    z.string().max(500).optional().nullable()
  ),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
  isActive: z.preprocess(coerceBoolean, z.boolean().optional().default(true)),
  grades: z.array(gradingGradeSchema).optional(),
}).passthrough();

export const updateGradingSchemaBody = z.object({
  gradingId: z.preprocess(emptyStringToNull, z.coerce.number().int().optional().nullable()),
  universityId: z.preprocess(emptyStringToNull, z.coerce.number().int().optional().nullable()),
  gradingName: z.string().min(1).max(100).optional(),
  gradingCode: z.string().min(1).max(20).optional(),
  gradingMethod: z.enum(["ABSOLUTE", "RELATIVE"]).optional(),
  distributionMethod: z.preprocess(
    emptyStringToNull,
    z.enum(["PERCENTILE", "BELL_CURVE", "Z_SCORE", "MANUAL_DISTRIBUTION"]).optional().nullable()
  ),
  relativeConfig: z.preprocess(
    emptyStringToNull,
    z.union([z.record(z.string(), z.any()), z.null()]).optional()
  ),
  maximumMarks: z.preprocess(
    emptyStringToNull,
    z.coerce.number().positive().optional().nullable()
  ),
  minimumPassingMarks: z.preprocess(
    emptyStringToNull,
    z.coerce.number().min(0).optional().nullable()
  ),
  description: z.preprocess(
    emptyStringToNull,
    z.string().max(500).optional().nullable()
  ),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isActive: z.preprocess(coerceBoolean, z.boolean().optional()),
  grades: z.array(gradingGradeSchema).optional(),
}).passthrough();

export const updateGradingSchemaGradeBody = z.object({
  gradingGradeId: z.preprocess(emptyStringToNull, z.coerce.number().int().optional().nullable()),
  gradingId: z.preprocess(emptyStringToNull, z.coerce.number().int().optional().nullable()),
  grade: z.string().min(1).max(10).optional(),
  minPercentage: z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(100).optional().nullable()),
  maxPercentage: z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(100).optional().nullable()),
  lowerBound: z.preprocess(emptyStringToNull, z.coerce.number().optional().nullable()),
  upperBound: z.preprocess(emptyStringToNull, z.coerce.number().optional().nullable()),
  expectedStudentsPercentage: z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(100).optional().nullable()),
  isRuleBased: z.preprocess(coerceBoolean, z.boolean().optional()),
  gradePoint: z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(100).optional()),
  resultLabel: z.string().min(1).max(100).optional(),
  remarks: z.preprocess(emptyStringToNull, z.string().max(255).optional().nullable()),
  sortOrder: z.preprocess(emptyStringToNull, z.coerce.number().int().optional()),
  isPass: z.preprocess(coerceBoolean, z.boolean().optional()),
  isActive: z.preprocess(coerceBoolean, z.boolean().optional()),
}).passthrough();

export const listGradingSchemaQuery = z.object({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  gradingMethod: z.enum(["ABSOLUTE", "RELATIVE"]).optional(),
  distributionMethod: z
    .enum(["PERCENTILE", "BELL_CURVE", "Z_SCORE", "MANUAL_DISTRIBUTION"])
    .optional(),
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

router.patch(
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
