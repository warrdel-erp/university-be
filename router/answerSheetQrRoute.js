import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import {
  generateAnswerSheetQrBulk,
  getAnswerSheetQrById,
  mapAnswerSheetQr,
  getAnswerSheetQrGenerationRequests,
  getAnswerSheetQrsByRequestId,
  assignAnswerSheetsToTeachers,
  getScriptsAssignedToTeacher,
  getMyAssignedScripts,
  getMyAnswerSheetSkuStats,
  getAnswerSheetSkuStats,
  getMyEvaluationSummary,
  assignObtainedMarksToAnswerSheet,
  assignMyObtainedMarksToAnswerSheet,
  splitAnswerSheetPdf,
  getSplitPdfJobStatus,
  getMappedAnswerSheetsByExamSession,
  getMySingleAssignedScript,
  getEvaluationAssignmentById,
} from "../controllers/answerSheetQrController.js";

const router = Router();

const bulkGenerateSchema = z.object({
  count: z
    .number({ required_error: "Count is required." })
    .int("Count must be a whole number.")
    .min(1, "Count must be at least 1."),
});

const mapSchema = z
  .object({
    qr: z
      .string({ required_error: "QR value is required." })
      .trim()
      .min(1, "QR value is required."),
    studentId: z.number().int().positive({
      message: "Student ID must be a positive number.",
    }),
    examScheduleId: z.number().int().positive({
      message: "Exam Schedule ID must be a positive number.",
    }),
  });

const idParamSchema = z.object({
  id: z.coerce
    .number()
    .int("id must be an integer")
    .positive("id must be greater than 0"),
});

const requestIdParamSchema = z.object({
  requestId: z.string().uuid("requestId must be a valid UUID"),
});

const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int("page must be an integer")
    .min(1, "page must be at least 1")
    .optional()
    .default(1),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1, "limit must be at least 1")
    .optional()
    .default(20),
});

const assignTeachersSchema = z.object({
  assignedToUserId: z.coerce
    .number()
    .int("assignedToUserId must be an integer")
    .positive("assignedToUserId must be greater than 0"),
  answerSheetQrIds: z
    .array(
      z.coerce
        .number()
        .int("answerSheetQrId must be an integer")
        .positive("answerSheetQrId must be greater than 0")
    )
    .min(1, "At least one answerSheetQrId is required"),
  deadlineDate: z
    .string({ required_error: "deadlineDate is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD"),
  notes: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.string().trim().max(5000, "notes must be at most 5000 characters").optional(),
  ),
});

const teacherIdParamSchema = z.object({
  assignedToUserId: z.coerce
    .number()
    .int("assignedToUserId must be an integer")
    .positive("assignedToUserId must be greater than 0"),
});

const assignmentIdParamSchema = z.object({
  assignmentId: z.coerce
    .number()
    .int("assignmentId must be an integer")
    .positive("assignmentId must be greater than 0"),
});

const assignObtainedMarksSchema = z.object({
  obtained_marks: z.coerce
    .number()
    .min(0, "obtained_marks must be greater than or equal to 0")
    .max(999.99, "obtained_marks must be less than or equal to 999.99"),
});

const emptyToUndefined = (val) => (val === "" ? undefined : val);
const positiveIntegerQueryId = z.preprocess(
  (val) => (typeof val === "string" ? parseInt(val, 10) : val),
  z
    .number({ invalid_type_error: "Must be an integer" })
    .int()
    .positive()
    .nullable()
    .optional(),
).transform((val) => (val === undefined || val === null ? null : val));

const positiveIntegerId = z.preprocess(
  (val) => (typeof val === "string" ? parseInt(val, 10) : val),
  z
    .number({
      required_error: "ID is required",
      invalid_type_error: "ID must be a number",
    })
    .int()
    .positive(),
);

const numberList = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return Array.isArray(val) ? val : String(val).split(",");
  },
  z.array(z.coerce.number().int().positive()).optional(),
);

const mappedSelectionsSchema = z.preprocess(
  (val) => {
    if (!val || val === "") return undefined;
    try {
      return typeof val === "string" ? JSON.parse(val) : val;
    } catch {
      return undefined;
    }
  },
  z
    .array(
      z.object({
        courseSessionMappingId: z.coerce.number().int().positive(),
        terms: z.array(z.coerce.number().int().positive()),
      }),
    )
    .optional(),
);

const listMappedAnswerSheetsSchema = z.object({
  examinationSessionId: positiveIntegerId,
  examDate: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD")
      .optional(),
  ),
  examinationSessionSlotId: positiveIntegerQueryId,
  examScheduleId: numberList,
  selections: mappedSelectionsSchema,
  subjectId: z.preprocess(
    (val) => {
      if (!val || val === "") return undefined;
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [val];
      }
    },
    z.array(z.coerce.number().int().positive()).optional()
  ),
  search: z.preprocess(emptyToUndefined, z.string().optional()),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(["unassigned", "graded", "withEvaluator"]).optional(),
  ),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
});

import { checkAccess, checkAccessAny } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post(
  "/bulk",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS_ADD.value, null),
  validate({ body: bulkGenerateSchema }),
  generateAnswerSheetQrBulk
);

router.get(
  "/requests",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ query: paginationSchema }),
  getAnswerSheetQrGenerationRequests
);

const mappedByExamSessionSchema = z.object({
  examinationSessionId: z.coerce.number(),
  examScheduleId: numberList,
  term: numberList,
  selections: mappedSelectionsSchema,
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

router.get(
  "/mappedByExamSession",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ query: mappedByExamSessionSchema }),
  getMappedAnswerSheetsByExamSession
);

router.get(
  "/requests/:requestId/qrs",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ params: requestIdParamSchema, query: paginationSchema }),
  getAnswerSheetQrsByRequestId
);

router.get(
  "/my/skuStats",
  userAuth,
  getMyAnswerSheetSkuStats,
);

router.get(
  "/my/summary",
  userAuth,
  getMyEvaluationSummary,
);

router.get(
  "/my/single",
  userAuth,
  getMySingleAssignedScript,
);

router.get(
  "/my",
  userAuth,
  validate({ query: paginationSchema }),
  getMyAssignedScripts,
);

router.patch(
  "/my/:id/obtainedMarks",
  userAuth,
  validate({ params: idParamSchema, body: assignObtainedMarksSchema }),
  assignMyObtainedMarksToAnswerSheet,
);

router.patch(
  "/map",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_MAPPING.value, null),
  validate({ body: mapSchema }),
  mapAnswerSheetQr
);

router.get(
  "/skuStats",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({
    query: z.object({
      examinationSessionId: positiveIntegerId,
    }),
  }),
  getAnswerSheetSkuStats
);

router.get(
  "/mapped",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ query: listMappedAnswerSheetsSchema }),
  getMappedAnswerSheetsByExamSession
);

router.get(
  "/assignment/:assignmentId",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ params: assignmentIdParamSchema }),
  getEvaluationAssignmentById
);

router.get(
  "/:id",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ params: idParamSchema }),
  getAnswerSheetQrById
);

router.post(
  "/assign/evaluator",
  userAuth,
  checkAccess(PERMISSIONS.EVALUATION_EXECUTE.value, null),
  validate({ body: assignTeachersSchema }),
  assignAnswerSheetsToTeachers
);


router.get(
  "/evaluator/:assignedToUserId",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ params: teacherIdParamSchema, query: paginationSchema }),
  getScriptsAssignedToTeacher
);

router.patch(
  "/:id/obtainedMarks",
  userAuth,
  checkAccess(PERMISSIONS.EVALUATION_EXECUTE.value, null),
  validate({ params: idParamSchema, body: assignObtainedMarksSchema }),
  assignObtainedMarksToAnswerSheet
);

const splitPdfSchema = z.object({
  answerSheetS3FileId: z
    .number({ required_error: "answerSheetS3FileId is required." })
    .int("answerSheetS3FileId must be an integer.")
    .positive("answerSheetS3FileId must be a positive integer."),
});

// ─── POST /answerSheetQr/splitPdf ───────────────────────────────────────────────────────
// Queues a large answer-sheet PDF split job (BullMQ + Redis).
// Returns 202 { jobId, jobDbId, statusUrl }.
router.post(
  "/splitPdf",
  userAuth,
  validate({ body: splitPdfSchema }),
  splitAnswerSheetPdf
);

// ─── GET /answerSheetQr/splitPdf/job/:jobDbId ─────────────────────────────────────────
// Poll the status of a queued PDF split job (reads from DB — persistent).
router.get(
  "/splitPdf/job/:jobDbId",
  userAuth,
  getSplitPdfJobStatus
);

export default router;
