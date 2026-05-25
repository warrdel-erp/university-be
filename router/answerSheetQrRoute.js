import { Router } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
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
  splitAnswerSheetPdf,
} from "../controllers/answerSheetQrController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Multer: disk storage for large PDF uploads ───────────────────────────────
const uploadDir = path.join(__dirname, "..", "uploads", "tmp", "pdf-uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted. Please upload a valid PDF."));
    }
  },
});

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

// ─── POST /answerSheetQr/split-pdf ────────────────────────────────────────────
// Upload a large answer-sheet PDF; splits it into per-student PDFs using QR codes.
// Field name: "answerSheet" (single PDF file, max 500 MB)
router.post(
  "/splitPdf",
  userAuth,
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      return next();
    }
    pdfUpload.single("answerSheet")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "The uploaded file is too large. Maximum allowed size is 500 MB.",
            errors: null,
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
          errors: null,
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
          errors: null,
        });
      }
      next();
    });
  },
  splitAnswerSheetPdf
);

export default router;
