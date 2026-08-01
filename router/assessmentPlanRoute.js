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
} from "../controllers/assessmentPlanController.js";

const router = express.Router();

export const overviewQuerySchema = z.object({
  courseId: z.union([z.string(), z.number()]).optional(),
  sessionId: z.union([z.string(), z.number()]).optional(),
  subjectId: z.union([z.string(), z.number()]).optional(),
  assessmentPlanId: z.union([z.string(), z.number()]).optional(),
  academicRegulationId: z.union([z.string(), z.number()]).optional(),
  term: z.union([z.string(), z.number()]).optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export const componentSchema = z.object({
  examSetupTypeId: z.coerce.number().int().positive().optional().nullable(),
  evaluationBy: z.enum(["Faculty", "CoE", "External"]).optional().default("Faculty"),
  weightagePercentage: z.coerce.number().nonnegative(),
  maxAssessments: z.coerce.number().int().positive().optional().default(1),
});

export const createAssessmentPlanBody = z.object({
  planName: z.string().min(1).max(100),
  planCode: z.string().min(1).max(50),
  description: z.string().max(500).optional().nullable(),
  courseId: z.coerce.number().int().positive().optional().nullable(),
  sessionId: z.coerce.number().int().positive().optional().nullable(),
  regulationId: z.coerce.number().int().positive().optional().nullable(),
  term: z.coerce.number().int().positive().optional().nullable(),
  gradingScheme: z.string().max(50).optional().nullable(),
  status: z.enum(["Draft", "Active", "Archived"]).optional().default("Draft"),
  isActive: z.boolean().optional().default(true),
  components: z.array(componentSchema).optional(),
});

export const updateAssessmentPlanBody = createAssessmentPlanBody.partial();

export const listAssessmentPlanQuery = z.object({
  search: z.string().optional(),
  status: z.enum(["Draft", "Active", "Archived"]).optional(),
  courseId: z.union([z.string(), z.number()]).optional(),
  sessionId: z.union([z.string(), z.number()]).optional(),
  regulationId: z.union([z.string(), z.number()]).optional(),
  academicYearId: z.union([z.string(), z.number()]).optional(),
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

export default router;
