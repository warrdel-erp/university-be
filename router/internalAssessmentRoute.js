import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import {
  getUserInternalAssessments,
  createInternalAssessment,
  getInternalAssessmentsBySubject,
  getInternalAssessmentById,
  getAssessmentStatusCounts,
  getUserDashboardSku,
  updateInternalAssessment,
  getStudentEvaluations,
  getMarksTableBySubject,
  upsertStudentEvaluations,
  getStudentsByClassSectionTermId,
} from "../controllers/internalAssessmentController.js";

const router = Router();

const createInternalAssessmentSchema = z.object({
  subjectId: z.number().int().positive(),
  classSectionTermId: z.number().int().positive(),
  type: z.string().min(1),
  title: z.string().min(1),
  maximumMarks: z.number().int().positive(),
  issueDate: z.string(),
  dueDate: z.string(),
  documentUrl: z.string().optional(),
  mode: z.enum(["online", "offline"]),
});

const listInternalAssessmentsQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  classSectionTermId: z.coerce.number().int().positive(),
});

const classSectionTermIdQuerySchema = z.object({
  classSectionTermId: z.coerce.number().int().positive(),
});

const internalAssessmentIdQuerySchema = z.object({
  internalAssessmentId: z.coerce.number().int().positive(),
});

const assessmentStatusCountsQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  classSectionTermId: z.coerce.number().int().positive(),
});

const updateInternalAssessmentSchema = z.object({
  type: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  maximumMarks: z.number().int().positive().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  documentUrl: z.string().nullable().optional(),
  mode: z.enum(["online", "offline"]).optional(),
  weightagePercentage: z.number().min(0).max(100).optional(),
  normalizedMaxMarks: z.number().min(0).optional(),
});

const upsertStudentEvaluationsSchema = z.object({
  marks: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        obtainedMarks: z.number().min(0).nullable(),
      }),
    )
    .min(1),
});

router.get("/my", userAuth, getUserInternalAssessments);
router.get("/my/sku", userAuth, getUserDashboardSku);
router.post(
  "/my",
  userAuth,
  validate({ body: createInternalAssessmentSchema }),
  createInternalAssessment,
);
router.get(
  "/my/list",
  userAuth,
  validate({ query: listInternalAssessmentsQuerySchema }),
  getInternalAssessmentsBySubject,
);
router.get(
  "/my/summary",
  userAuth,
  validate({ query: assessmentStatusCountsQuerySchema }),
  getAssessmentStatusCounts,
);
router.get(
  "/my/students",
  userAuth,
  validate({ query: classSectionTermIdQuerySchema }),
  getStudentsByClassSectionTermId,
);
router.get(
  "/my/single",
  userAuth,
  validate({ query: internalAssessmentIdQuerySchema }),
  getInternalAssessmentById,
);
router.patch(
  "/my",
  userAuth,
  validate({
    query: internalAssessmentIdQuerySchema,
    body: updateInternalAssessmentSchema,
  }),
  updateInternalAssessment,
);
router.get(
  "/my/marks/table",
  userAuth,
  validate({ query: listInternalAssessmentsQuerySchema }),
  getMarksTableBySubject,
);
router.get(
  "/my/marks",
  userAuth,
  validate({ query: internalAssessmentIdQuerySchema }),
  getStudentEvaluations,
);
router.put(
  "/my/marks",
  userAuth,
  validate({
    query: internalAssessmentIdQuerySchema,
    body: upsertStudentEvaluationsSchema,
  }),
  upsertStudentEvaluations,
);

export default router;
