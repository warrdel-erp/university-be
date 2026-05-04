import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import {
  generateAnswerSheetQrBulk,
  getAnswerSheetQrList,
  getAnswerSheetQrById,
  mapAnswerSheetQr,
} from "../controllers/answerSheetQrController.js";

const router = Router();

const bulkGenerateSchema = z.object({
  count: z
    .number({ required_error: "Count is required." })
    .int("Count must be a whole number.")
    .min(1, "Count must be at least 1.")
    .max(5000, "You can generate up to 1000 QR codes in one request."),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  usageType: z.enum(["all", "used", "unused"]).optional().default("all"),
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

router.post(
  "/bulk",
  userAuth,
  validate({ body: bulkGenerateSchema }),
  generateAnswerSheetQrBulk
);
router.get("/", userAuth, validate({ query: listSchema }), getAnswerSheetQrList);
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
