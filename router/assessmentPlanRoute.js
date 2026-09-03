import express from "express";
import { z } from "zod";
import useAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";
import {
  createAssessmentPlan,
  getAssessmentPlans,
  getAssessmentPlanById,
  updateAssessmentPlan,
  deleteAssessmentPlan,
  createAssessmentPlanComponent,
  updateAssessmentPlanComponent,
  deleteAssessmentPlanComponent,
  getCourseAssessmentPlanOverview,
  getAssessmentPlanStats,
  createAssessmentPlanSubjectMapping,
  getAssessmentPlanSubjectMappings,
  deleteAssessmentPlanSubjectMapping,
} from "../controllers/assessmentPlanController.js";

const router = express.Router();

export const createSubjectMappingBody = z.object({
  assessmentPlanId: z.coerce.number().int().positive("assessmentPlanId is required"),
  subjectId: z.coerce.number().int().positive("subjectId is required"),
  courseId: z.coerce.number().int().positive("courseId is required"),
  sessionId: z.coerce.number().int().positive("sessionId is required"),
});

export const listSubjectMappingQuery = z.object({
  assessmentPlanId: z.union([z.string(), z.number()]).optional(),
  subjectId: z.union([z.string(), z.number()]).optional(),
  courseId: z.union([z.string(), z.number()]).optional(),
  sessionId: z.union([z.string(), z.number()]).optional(),
  academicYearId: z.union([z.string(), z.number()]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export const statsQuerySchema = z.object({
  courseId: z.union([z.string(), z.number()]).optional(),
  sessionId: z.union([z.string(), z.number()]).optional(),
  term: z.union([z.string(), z.number()]).optional(),
});

export const overviewQuerySchema = z.object({
  courseId: z.union([z.string(), z.number()]).optional(),
  sessionId: z.union([z.string(), z.number()]).optional(),
  subjectId: z.union([z.string(), z.number()]).optional(),
  assessmentPlanId: z.union([z.string(), z.number()]).optional(),
  academicRegulationId: z.union([z.string(), z.number()]).optional(),
  assignmentStatus: z.enum(["assigned", "unassigned", "all"]).optional().default("all"),
  term: z.union([z.string(), z.number()]).optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export const componentSchema = z.object({
  examSetupTypeId: z.coerce.number().int().positive().optional().nullable(),
  weightagePercentage: z.coerce.number().nonnegative(),
  maxAssessments: z.coerce.number().int().positive().optional().default(1),
  duration: z.coerce.number().int().positive().optional().nullable(),
});

export const createAssessmentPlanBody = z.object({
  planName: z.string().min(1).max(100),
  planCode: z.string().min(1).max(50),
  description: z.string().max(500).optional().nullable(),
  courseId: z.coerce.number().int().positive().optional().nullable(),
  sessionId: z.coerce.number().int().positive().optional().nullable(),
  regulationId: z.coerce.number().int().positive().optional().nullable(),
  term: z.coerce.number().int().positive().optional().nullable(),
  gradingId: z.coerce.number().int().positive().optional().nullable(),
  status: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(["Draft", "Published"]).optional().default("Draft")),
  isActive: z.boolean().optional().default(true),
  components: z.array(componentSchema).optional(),
});

export const updateAssessmentPlanBody = createAssessmentPlanBody.partial();

export const listAssessmentPlanQuery = z.object({
  search: z.string().optional(),
  status: z.preprocess((val) => (val === "Draft" || val === "Published" ? val : undefined), z.enum(["Draft", "Published"]).optional()),
  courseId: z.union([z.string(), z.number()]).optional(),
  sessionId: z.union([z.string(), z.number()]).optional(),
  regulationId: z.union([z.string(), z.number()]).optional(),
  academicYearId: z.union([z.string(), z.number()]).optional(),
  gradingId: z.union([z.string(), z.number()]).optional(),
  term: z.union([z.string(), z.number()]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export const createAssessmentPlanComponentBody = componentSchema.extend({
  assessmentPlanId: z.coerce.number().int().positive(),
});

export const updateAssessmentPlanComponentBody = componentSchema.partial();

// ==========================================
// ASSESSMENT PLAN ENDPOINTS
// ==========================================

router.post(
  "/",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null),
  validate({ body: createAssessmentPlanBody }),
  createAssessmentPlan
);

router.get(
  "/",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  validate({ query: listAssessmentPlanQuery }),
  getAssessmentPlans
);

router.get(
  "/overview",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  validate({ query: overviewQuerySchema }),
  getCourseAssessmentPlanOverview
);

router.get(
  "/stats",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getAssessmentPlanStats
);

// ==========================================
// ASSESSMENT PLAN COMPONENT ENDPOINTS
// ==========================================

router.post(
  "/component",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null),
  validate({ body: createAssessmentPlanComponentBody }),
  createAssessmentPlanComponent
);

router.patch(
  "/component/:assessmentPlanComponentId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  validate({ body: updateAssessmentPlanComponentBody }),
  updateAssessmentPlanComponent
);

router.delete(
  "/component/:assessmentPlanComponentId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  deleteAssessmentPlanComponent
);

// ==========================================
// ASSESSMENT PLAN SUBJECT MAPPING ENDPOINTS
// ==========================================

router.post(
  "/subjectMapping",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null),
  validate({ body: createSubjectMappingBody }),
  createAssessmentPlanSubjectMapping
);

router.get(
  "/subjectMapping",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getAssessmentPlanSubjectMappings
);

router.delete(
  "/subjectMapping/:mappingId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  deleteAssessmentPlanSubjectMapping
);

// ==========================================
// ASSESSMENT PLAN BY ID ENDPOINTS (WILDCARD)
// ==========================================

router.get(
  "/:assessmentPlanId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getAssessmentPlanById
);

router.patch(
  "/:assessmentPlanId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  validate({ body: updateAssessmentPlanBody }),
  updateAssessmentPlan
);

router.delete(
  "/:assessmentPlanId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  deleteAssessmentPlan
);

export default router;
