import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import * as controller from "../controllers/billingScheduleController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const moneyNumber = z.coerce.number().min(0, "amount cannot be negative");

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const statusEnum = z.enum(["pending", "scheduled", "billed", "cancelled"]);

const subItemInputSchema = z.object({
  feePlanSubItemId: positiveIntegerId,
  amount: moneyNumber,
});

const installmentSchema = z.coerce
  .number({ invalid_type_error: "installment must be a number" })
  .int({ message: "installment must be an integer" })
  .positive({ message: "installment must be positive" });

const paymentTermInputSchema = z.object({
  installment: installmentSchema,
});

const singleScheduleInputSchema = z.object({
  feePlanItemId: positiveIntegerId,
  amount: moneyNumber.optional(),
  plannedDate: dateOnly.optional().nullable(),
  status: statusEnum.optional().default("pending"),
  subItems: z.array(subItemInputSchema).optional(),
  installment: installmentSchema.optional(),
  paymentTerms: z.array(paymentTermInputSchema).optional(),
});

const createBillingScheduleSchema = z.union([
  z
    .array(singleScheduleInputSchema)
    .min(1, "At least one billing schedule item is required"),
  singleScheduleInputSchema,
  z.object({
    feePlanItemId: positiveIntegerId.optional(),
    schedules: z
      .array(singleScheduleInputSchema)
      .min(1, "At least one billing schedule item is required"),
  }),
]);

const updateBillingScheduleSchema = z.object({
  billingScheduleItemId: positiveIntegerId,
  amount: moneyNumber.optional(),
  plannedDate: dateOnly.optional().nullable(),
  status: statusEnum.optional(),
  subItems: z.array(subItemInputSchema).optional(),
});

const updateStatusSchema = z.object({
  billingScheduleItemId: positiveIntegerId,
  status: statusEnum,
});

const singleScheduleQuerySchema = z.object({
  billingScheduleItemId: positiveIntegerId,
});

const listBatchesQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    courseId: positiveIntegerId.optional(),
    sessionId: positiveIntegerId.optional(),
    batchId: positiveIntegerId.optional(),
  })
  .passthrough();

const batchOverviewQuerySchema = z.object({
  batchId: positiveIntegerId,
  year: positiveIntegerId.optional(),
});

const listScheduleQuerySchema = z.object({
  feePlanItemId: positiveIntegerId.optional(),
  status: statusEnum.optional(),
  fromDate: dateOnly.optional(),
  toDate: dateOnly.optional(),
  page: positiveIntegerId.optional().default(1),
  limit: positiveIntegerId.optional().default(10),
});

const addSubItemSchema = z.object({
  billingScheduleItemId: positiveIntegerId,
  feePlanSubItemId: positiveIntegerId,
  amount: moneyNumber,
});

const deleteSubItemQuerySchema = z.object({
  billingScheduleSubItemId: positiveIntegerId,
});

const addPaymentTermSchema = z.object({
  billingScheduleItemId: positiveIntegerId,
  installment: installmentSchema,
});

const deletePaymentTermQuerySchema = z.object({
  billingSchedulePaymentTermsId: positiveIntegerId,
});

const reviewScheduleQuerySchema = z
  .object({
    feePlanItemId: positiveIntegerId.optional(),
    billingScheduleItemId: positiveIntegerId.optional(),
    batchId: positiveIntegerId.optional(),
    year: positiveIntegerId.optional(),
  })
  .refine(
    (data) => Boolean(data.feePlanItemId || data.billingScheduleItemId || data.batchId),
    {
      message: "At least one of feePlanItemId, billingScheduleItemId, or batchId is required",
      path: ["feePlanItemId"],
    }
  );

const batchReviewQuerySchema = z
  .object({
    batchId: positiveIntegerId,
    year: positiveIntegerId,
  })
  .passthrough();

// 1. Get batches overview by year by query key batchId
router.get(
  "/batches/overview",
  userAuth,
  validate({ query: batchOverviewQuerySchema }),
  controller.getBillingScheduleBatchOverview,
);

// 2. Get all batches grouped course-wise
router.get(
  "/batches",
  userAuth,
  validate({ query: listBatchesQuerySchema }),
  controller.getBillingScheduleBatches,
);

// 3. Get detailed schedule review for a batch and year
router.get(
  "/batches/review",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: batchReviewQuerySchema }),
  controller.getBillingScheduleBatchReview,
);

// Endpoints
router.post(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: createBillingScheduleSchema }),
  controller.createBillingSchedule,
);

router.get(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: listScheduleQuerySchema }),
  controller.getBillingSchedules,
);

router.get(
  "/review",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: reviewScheduleQuerySchema }),
  controller.getBillingScheduleReview
);

router.get(
  "/view",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: singleScheduleQuerySchema }),
  controller.getBillingScheduleView
);

router.get(
  "/single",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: singleScheduleQuerySchema }),
  controller.getBillingScheduleView,
);

router.patch(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value),
  validate({ body: updateBillingScheduleSchema }),
  controller.updateBillingSchedule,
);

router.patch(
  "/status",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value),
  validate({ body: updateStatusSchema }),
  controller.updateBillingScheduleStatus,
);

router.delete(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: singleScheduleQuerySchema }),
  controller.deleteBillingSchedule,
);

router.post(
  "/subItem",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: addSubItemSchema }),
  controller.addBillingScheduleSubItem,
);

router.delete(
  "/subItem",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: deleteSubItemQuerySchema }),
  controller.deleteBillingScheduleSubItem,
);

// Create payment terms (Add one or many payment terms)
router.post(
  "/paymentTerm",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: addPaymentTermSchema }),
  controller.addBillingSchedulePaymentTerm,
);

router.delete(
  "/paymentTerm",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: deletePaymentTermQuerySchema }),
  controller.deleteBillingSchedulePaymentTerm,
);

export default router;
