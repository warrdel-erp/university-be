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
  getMyEvaluationSummary,
  assignObtainedMarksToAnswerSheet,
  splitAnswerSheetPdf,
  getSplitPdfJobStatus,
  getMappedAnswerSheetsByExamSession,
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
});

const teacherIdParamSchema = z.object({
  assignedToUserId: z.coerce
    .number()
    .int("assignedToUserId must be an integer")
    .positive("assignedToUserId must be greater than 0"),
});

const assignObtainedMarksSchema = z.object({
  obtained_marks: z.coerce
    .number()
    .min(0, "obtained_marks must be greater than or equal to 0")
    .max(999.99, "obtained_marks must be less than or equal to 999.99"),
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

const numberList = z.preprocess(
  (val) => (Array.isArray(val) ? val : String(val).split(",")),
  z.array(z.coerce.number()),
).optional();

const optionalSelections = z.preprocess(
  (val) => (typeof val === "string" ? JSON.parse(val) : val),
  z.array(
    z.object({
      sessionCourseMappingId: z.coerce.number().optional(),
      courseSessionMappingId: z.coerce.number().optional(),
      terms: z.array(z.coerce.number()).optional(),
    }).transform((item) => ({
      sessionCourseMappingId:
        item.sessionCourseMappingId ?? item.courseSessionMappingId,
      terms: item.terms,
    })),
  ),
).optional();

const mappedByExamSessionSchema = z.object({
  examinationSessionId: z.coerce.number(),
  examScheduleId: numberList,
  term: numberList,
  selections: optionalSelections,
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
  "/my/summary",
  userAuth,
  checkAccess(PERMISSIONS.TEACHER_EVALUATION.value, null),
  getMyEvaluationSummary,
);

router.get(
  "/my",
  userAuth,
  checkAccess(PERMISSIONS.TEACHER_EVALUATION.value, null),
  validate({ query: paginationSchema }),
  getMyAssignedScripts,
);

router.get(
  "/:id",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_QRS.value, null),
  validate({ params: idParamSchema }),
  getAnswerSheetQrById
);

router.patch(
  "/map",
  userAuth,
  checkAccess(PERMISSIONS.ANSWER_SHEET_MAPPING.value, null),
  validate({ body: mapSchema }),
  mapAnswerSheetQr
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
