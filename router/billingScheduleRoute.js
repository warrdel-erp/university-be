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

const singleScheduleInputSchema = z.object({
  feePlanItemId: positiveIntegerId,
  amount: moneyNumber.optional(),
  dueDate: dateOnly.optional().nullable(),
  plannedDate: dateOnly.optional().nullable(),
  status: statusEnum.optional().default("pending"),
  subItems: z.array(subItemInputSchema).optional(),
});

const createBillingScheduleSchema = z.union([
  z.array(singleScheduleInputSchema).min(1, "At least one billing schedule item is required"),
  singleScheduleInputSchema,
  z.object({
    feePlanItemId: positiveIntegerId.optional(),
    schedules: z.array(singleScheduleInputSchema).min(1, "At least one billing schedule item is required"),
  }),
]);

const updateBillingScheduleSchema = z.object({
  billingScheduleItemId: positiveIntegerId,
  amount: moneyNumber.optional(),
  dueDate: dateOnly.optional().nullable(),
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

// Endpoints
router.post(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: createBillingScheduleSchema }),
  controller.createBillingSchedule
);

router.get(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: listScheduleQuerySchema }),
  controller.getBillingSchedules
);

router.get(
  "/single",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: singleScheduleQuerySchema }),
  controller.getSingleBillingSchedule
);

router.patch(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value),
  validate({ body: updateBillingScheduleSchema }),
  controller.updateBillingSchedule
);

router.patch(
  "/status",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value),
  validate({ body: updateStatusSchema }),
  controller.updateBillingScheduleStatus
);

router.delete(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: singleScheduleQuerySchema }),
  controller.deleteBillingSchedule
);

router.post(
  "/subItem",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: addSubItemSchema }),
  controller.addBillingScheduleSubItem
);

router.delete(
  "/subItem",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: deleteSubItemQuerySchema }),
  controller.deleteBillingScheduleSubItem
);

export default router;
