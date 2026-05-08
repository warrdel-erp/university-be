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
  assignObtainedMarksToAnswerSheet,
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

router.post(
  "/bulk",
  userAuth,
  validate({ body: bulkGenerateSchema }),
  generateAnswerSheetQrBulk
);

router.get(
  "/requests",
  userAuth,
  validate({ query: paginationSchema }),
  getAnswerSheetQrGenerationRequests
);

router.get(
  "/requests/:requestId/qrs",
  userAuth,
  validate({ params: requestIdParamSchema, query: paginationSchema }),
  getAnswerSheetQrsByRequestId
);

router.get(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getAnswerSheetQrById
);

router.patch(
  "/map",
  userAuth,
  validate({ body: mapSchema }),
  mapAnswerSheetQr
);

router.post(
  "/assign/evaluator",
  userAuth,
  validate({ body: assignTeachersSchema }),
  assignAnswerSheetsToTeachers
);

router.get(
  "/evaluator/:assignedToUserId",
  userAuth,
  validate({ params: teacherIdParamSchema, query: paginationSchema }),
  getScriptsAssignedToTeacher
);

router.patch(
  "/:id/obtainedMarks",
  userAuth,
  validate({ params: idParamSchema, body: assignObtainedMarksSchema }),
  assignObtainedMarksToAnswerSheet
);

export default router;
