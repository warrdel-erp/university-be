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
  id: z.coerce.number().int().positive(),
});

const requestIdParamSchema = z.object({
  requestId: z.string().uuid("requestId must be a valid UUID"),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().optional().default(1),
  limit: z.coerce.number().int().optional().default(20),
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

export default router;
