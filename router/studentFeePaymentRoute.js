import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  recordStudentFeePaymentFromDetails,
  listStudentFeePayments,
  getStudentFeePaymentById,
  getPaymentDetails,
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

const paymentDetailsPaymentItemSchema = z.object({
  studentFeeInvoiceId: positiveIntegerId,
  amount: moneyAmount,
});

const recordPaymentDetailsBodySchema = z.object({
  payeeId: positiveIntegerId,
  amount: moneyAmount,
  paymentItems: z
    .array(paymentDetailsPaymentItemSchema)
    .min(1, "At least one payment item is required"),
  paymentMethod: paymentMethodEnum.optional().default("cash"),
  paymentType: paymentTypeEnum.optional().default("INCOMING"),
  payeeType: payeeTypeEnum.optional().default("STUDENT"),
  referenceNumber: z.string().trim().default(() => uuidv4()),
  transactionId: z.string().trim().default(() => uuidv4()),
  receivedBy: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

const paginationQueryFields = {
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
    .max(100, "limit must be at most 100")
    .optional()
    .default(20),
};

const listPaymentsQuerySchema = z.object({
  payeeId: positiveIntegerId.optional(),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  ...paginationQueryFields,
});

const paymentDetailsQuerySchema = z.object({
  studentId: positiveIntegerId,
});

const studentFeePaymentIdQuerySchema = z.object({
  studentFeePaymentId: positiveIntegerId,
});

router.get(
  "/",
  userAuth,
  validate({ query: listPaymentsQuerySchema }),
  listStudentFeePayments
);

router.get(
  "/single",
  userAuth,
  validate({ query: studentFeePaymentIdQuerySchema }),
  getStudentFeePaymentById
);

router.get(
  "/payment/details",
  userAuth,
  validate({ query: paymentDetailsQuerySchema }),
  getPaymentDetails
);

router.post(
  "/payment/details",
  userAuth,
  validate({ body: recordPaymentDetailsBodySchema }),
  recordStudentFeePaymentFromDetails
);

export default router;
