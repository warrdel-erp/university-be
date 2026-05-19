import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  recordStudentFeePayment,
  listStudentFeePayments,
} from "../controllers/studentFeePaymentController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const moneyAmount = z.coerce.string().trim().min(1);

const paymentMethodEnum = z.enum(["credit_card", "bank_transfer", "cash", "cheque"]);
const paymentTypeEnum = z.enum(["INCOMING", "OUTGOING"]);
const payeeTypeEnum = z.enum(["STUDENT", "VENDOR"]);

const recordPaymentBodySchema = z.object({
  studentFeeInvoiceId: positiveIntegerId,
  amount: moneyAmount,
  paymentMethod: paymentMethodEnum,
  paymentType: paymentTypeEnum.optional().default("INCOMING"),
  payeeId: positiveIntegerId.optional(),
  payeeType: payeeTypeEnum.optional().default("STUDENT"),
  referenceNumber: z.string().trim().optional(),
  transactionId: z.string().trim().optional(),
});

const studentFeeInvoiceIdQuerySchema = z.object({
  studentFeeInvoiceId: positiveIntegerId,
});

router.post(
  "/",
  userAuth,
  validate({ body: recordPaymentBodySchema }),
  recordStudentFeePayment
);

router.get(
  "/",
  userAuth,
  validate({ query: studentFeeInvoiceIdQuerySchema }),
  listStudentFeePayments
);

export default router;
