import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  generateStudentFeeInvoice,
  generateStudentFeeInvoiceFromAdditionalFees,
  getStudentFeeInvoiceById,
  listStudentFeeInvoicesByStudent,
  listAllStudentFeeInvoices,
} from "../controllers/studentFeeInvoiceController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const dateOnlyString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

const generateInvoiceBodySchema = z.object({
  studentId: positiveIntegerId,
  feePlanItemId: positiveIntegerId,
});

const adhocFeeTypeCatalogLineSchema = z
  .object({
    feeTypeCatalogId: positiveIntegerId,
    amount: z.coerce.number().positive(),
    waiver: z.coerce.number().nonnegative().optional().nullable(),
  })
  .superRefine((line, ctx) => {
    if (line.waiver != null && line.waiver > line.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "waiver cannot exceed amount",
        path: ["waiver"],
      });
    }
  });

const generateAdhocInvoiceBodySchema = z.object({
  studentId: positiveIntegerId,
  feeTypeCatalogs: z
    .array(adhocFeeTypeCatalogLineSchema)
    .min(1, { message: "feeTypeCatalogs must contain at least one item" }),
  total: z.coerce.number().positive().optional(),
  createDate: dateOnlyString,
  dueDate: dateOnlyString.optional().nullable(),
});

const studentFeeInvoiceIdQuerySchema = z.object({
  studentFeeInvoiceId: positiveIntegerId,
});

const studentIdQuerySchema = z.object({
  studentId: positiveIntegerId,
});

const listAllInvoicesQuerySchema = z.object({
  paymentTab: z.enum(["all", "pending", "completed"]).optional(),
});

router.post(
  "/",
  userAuth,
  validate({ body: generateInvoiceBodySchema }),
  generateStudentFeeInvoice
);

router.post(
  "/additional",
  userAuth,
  validate({ body: generateAdhocInvoiceBodySchema }),
  generateStudentFeeInvoiceFromAdditionalFees
);

router.get(
  "/all",
  userAuth,
  validate({ query: listAllInvoicesQuerySchema }),
  listAllStudentFeeInvoices
);

router.get(
  "/single",
  userAuth,
  validate({ query: studentFeeInvoiceIdQuerySchema }),
  getStudentFeeInvoiceById
);

router.get("/", userAuth, validate({ query: studentIdQuerySchema }), listStudentFeeInvoicesByStudent);

export default router;
