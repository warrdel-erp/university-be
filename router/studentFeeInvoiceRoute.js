import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  generateStudentFeeInvoice,
  getStudentFeeInvoiceById,
  listStudentFeeInvoicesByStudent,
  listAllStudentFeeInvoices,
} from "../controllers/studentFeeInvoiceController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const generateInvoiceBodySchema = z.object({
  studentId: positiveIntegerId,
  feePlanItemId: positiveIntegerId,
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
