import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import * as examResultController from "../controllers/examResultController.js";
import { selectionsSchema } from "../utility/examZodSchemas.js";

const router = Router();

const id = z.coerce.number().int().positive();

const filterStatusQuery = z.preprocess(
  (val) => {
    if (val == null || val === "") return undefined;
    const normalized = String(val)
      .trim()
      .toLowerCase()
      .replace(/[_\s-]/g, "");
    if (normalized === "ready") return "Ready";
    if (normalized === "notready") return "NotReady";
    if (normalized === "published") return "Published";
    if (normalized === "generated") return "Generated";
    return val;
  },
  z.enum(["Ready", "NotReady", "Published", "Generated"]).optional(),
);

const query = z.object({
  examinationSessionId: id.optional(),
  selections: selectionsSchema,
  search: z.string().trim().optional(),
  filterStatus: filterStatusQuery,
  page: id.optional().default(1),
  limit: id.optional().default(20),
});

const skuQuery = z.object({
  examinationSessionId: id,
});

const createExaminationSessionResultBody = z.object({
  examinationSessionId: id,
  studentIds: z.array(id).min(1),
  gradingId: id.optional().nullable(),
  batchId: id.optional().nullable(),
});

const publishedResultQuery = z.object({
  examinationSessionId: id,
  studentId: id,
});

router.get(
  "/sku",
  userAuth,
  validate({ query: skuQuery }),
  examResultController.getSku,
);
router.get(
  "/students",
  userAuth,
  validate({ query }),
  examResultController.listStudents,
);
router.get(
  "/students/:studentId",
  userAuth,
  validate({ params: z.object({ studentId: id }), query }),
  examResultController.getStudentById,
);
router.post(
  "/examinationSessionResult",
  userAuth,
  validate({ body: createExaminationSessionResultBody }),
  examResultController.createExaminationSessionResult,
);
router.post(
  "/publish",
  userAuth,
  validate({ body: createExaminationSessionResultBody }),
  examResultController.publishExaminationSessionResults,
);
router.get(
  "/publishHistory",
  userAuth,
  validate({ query: z.object({ examinationSessionId: id }) }),
  examResultController.getPublishHistory,
);
router.get(
  "/publishHistory/:publishBatchId",
  userAuth,
  validate({ params: z.object({ publishBatchId: z.string().uuid() }) }),
  examResultController.getPublishHistoryByBatchId,
);
router.get(
  "/result",
  userAuth,
  validate({ query: publishedResultQuery }),
  examResultController.getStudentResultDetails,
);
const calculationBreakdownBody = z.object({
  examinationSessionId: id,
  studentIds: z.array(id).optional().default([]),
  gradingId: id.optional().nullable(),
  batchId: id.optional().nullable(),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
  search: z.string().trim().optional(),
}).passthrough();

const calculationBreakdownQuery = z.object({
  examinationSessionId: id.optional(),
  gradingId: id.optional().nullable(),
  batchId: id.optional().nullable(),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
  search: z.string().trim().optional(),
});

router.post(
  "/calculationBreakdown",
  userAuth,
  validate({ body: calculationBreakdownBody, query: calculationBreakdownQuery }),
  examResultController.getCalculationBreakdown,
);
router.post(
  "/calculation-breakdown",
  userAuth,
  validate({ body: calculationBreakdownBody, query: calculationBreakdownQuery }),
  examResultController.getCalculationBreakdown,
);
router.get(
  "/calculationBreakdown",
  userAuth,
  validate({ query: calculationBreakdownQuery }),
  examResultController.getCalculationBreakdown,
);
router.get(
  "/calculation-breakdown",
  userAuth,
  validate({ query: calculationBreakdownQuery }),
  examResultController.getCalculationBreakdown,
);

const subjectCalculationBreakdownBody = z.object({
  examinationSessionId: id,
  subjectId: id,
  term: z.coerce.number().int().positive().optional(),
  examScheduleId: id.optional(),
  gradingId: id.optional().nullable(),
  batchId: id.optional().nullable(),
  teacherId: id.optional().nullable(),
  assignedToUserId: id.optional().nullable(),
  studentIds: z.array(id).optional().default([]),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
  search: z.string().trim().optional(),
}).passthrough();

const subjectCalculationBreakdownQuery = z.object({
  examinationSessionId: id.optional(),
  subjectId: id.optional(),
  term: z.coerce.number().int().positive().optional(),
  examScheduleId: id.optional(),
  gradingId: id.optional().nullable(),
  batchId: id.optional().nullable(),
  teacherId: id.optional().nullable(),
  assignedToUserId: id.optional().nullable(),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
  search: z.string().trim().optional(),
});

router.post(
  "/subject/zscore",
  userAuth,
  validate({ body: subjectCalculationBreakdownBody, query: subjectCalculationBreakdownQuery }),
  examResultController.getSubjectCalculationBreakdown,
);
router.get(
  "/subject/zscore",
  userAuth,
  validate({ query: subjectCalculationBreakdownQuery }),
  examResultController.getSubjectCalculationBreakdown,
);
router.post(
  "/subject/calculation-breakdown",
  userAuth,
  validate({ body: subjectCalculationBreakdownBody, query: subjectCalculationBreakdownQuery }),
  examResultController.getSubjectCalculationBreakdown,
);
router.post(
  "/subject-calculation-breakdown",
  userAuth,
  validate({ body: subjectCalculationBreakdownBody, query: subjectCalculationBreakdownQuery }),
  examResultController.getSubjectCalculationBreakdown,
);
router.get(
  "/subject/calculation-breakdown",
  userAuth,
  validate({ query: subjectCalculationBreakdownQuery }),
  examResultController.getSubjectCalculationBreakdown,
);
router.get(
  "/subject-calculation-breakdown",
  userAuth,
  validate({ query: subjectCalculationBreakdownQuery }),
  examResultController.getSubjectCalculationBreakdown,
);

const subjectStudentsBody = z.object({
  examinationSessionId: id,
  subjectId: id.optional(),
  term: z.coerce.number().int().positive().optional(),
  teacherId: id.optional().nullable(),
  assignedToUserId: id.optional().nullable(),
  search: z.string().trim().optional(),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
}).passthrough();

const subjectStudentsQuery = z.object({
  examinationSessionId: id.optional(),
  subjectId: id.optional(),
  term: z.coerce.number().int().positive().optional(),
  teacherId: id.optional().nullable(),
  assignedToUserId: id.optional().nullable(),
  search: z.string().trim().optional(),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
});

router.get(
  "/subject/students",
  userAuth,
  validate({ query: subjectStudentsQuery }),
  examResultController.getSubjectStudentsWithSubmittedAnswerSheets,
);
router.post(
  "/subject/students",
  userAuth,
  validate({ body: subjectStudentsBody, query: subjectStudentsQuery }),
  examResultController.getSubjectStudentsWithSubmittedAnswerSheets,
);
router.get(
  "/subject-students",
  userAuth,
  validate({ query: subjectStudentsQuery }),
  examResultController.getSubjectStudentsWithSubmittedAnswerSheets,
);
router.post(
  "/subject-students",
  userAuth,
  validate({ body: subjectStudentsBody, query: subjectStudentsQuery }),
  examResultController.getSubjectStudentsWithSubmittedAnswerSheets,
);

const teacherZScoreQuery = z.object({
  examinationSessionId: id,
  teacherId: id.optional(),
  assignedToUserId: id.optional(),
  subjectId: id.optional(),
  term: z.coerce.number().int().positive().optional(),
  gradingId: id.optional().nullable(),
  batchId: id.optional().nullable(),
  search: z.string().trim().optional(),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
});

const teacherZScoreBody = z.object({
  examinationSessionId: id,
  teacherId: id.optional(),
  assignedToUserId: id.optional(),
  subjectId: id.optional(),
  term: z.coerce.number().int().positive().optional(),
  gradingId: id.optional().nullable(),
  batchId: id.optional().nullable(),
  search: z.string().trim().optional(),
  page: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.coerce.number().int().positive()).optional(),
  limit: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.union([z.coerce.number().int(), z.literal("all")]).optional()),
}).passthrough();

router.get(
  "/teacher/zscore",
  userAuth,
  validate({ query: teacherZScoreQuery }),
  examResultController.getTeacherZScoreList,
);
router.post(
  "/teacher/zscore",
  userAuth,
  validate({ body: teacherZScoreBody, query: teacherZScoreQuery }),
  examResultController.getTeacherZScoreList,
);
router.get(
  "/teacher-zscore",
  userAuth,
  validate({ query: teacherZScoreQuery }),
  examResultController.getTeacherZScoreList,
);
router.post(
  "/teacher-zscore",
  userAuth,
  validate({ body: teacherZScoreBody, query: teacherZScoreQuery }),
  examResultController.getTeacherZScoreList,
);

export default router;




