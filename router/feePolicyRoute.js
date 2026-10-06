import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  createFeePolicy,
  getFeePolicies,
  getSingleFeePolicy,
  updateFeePolicy,
  publishFeePolicy,
  unpublishFeePolicy,
  deleteFeePolicy,
} from "../controllers/feePolicyController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const moneyNumber = z.coerce.number().min(0);

const effectEnum = z.enum(["reduce_fee", "add_charge", "refund"]);
const calculationTypeEnum = z.enum([
  "percentage",
  "fixed_amount",
  "per_day",
  "percentage_of_outstanding",
  "slab_based",
]);
const appliesToEnum = z.enum(["all_components", "selected_components"]);

const slabSchema = z.object({
  relativePeriod: z.enum(["before", "after"]).nullable().optional(),
  fromUnit: z.coerce.number().int().min(0).default(0),
  toUnit: z.coerce.number().int().min(0).nullable().optional(),
  slabValue: z.coerce.number().min(0),
  orderIndex: z.coerce.number().int().optional(),
});

const yearTermSchema = z.object({
  year: z.coerce.number().int().positive().nullable().optional(),
  terms: z.array(z.coerce.number().int().positive()).optional(),
});

const courseScopeItemSchema = z.object({
  courseId: positiveIntegerId.optional(),
  batchId: positiveIntegerId.nullable().optional(),
  year: z.coerce.number().int().positive().nullable().optional(),
  terms: z.array(z.coerce.number().int().positive()).optional(),
  years: z.array(yearTermSchema).optional(),
}).refine((data) => data.courseId != null || data.batchId != null, {
  message: "Either courseId or batchId must be provided in scope mapping",
});

const batchItemSchema = courseScopeItemSchema;

const batchInputSchema = z.union([positiveIntegerId, courseScopeItemSchema]);

const createFeePolicySchema = z.object({
  policyName: z.string().trim().min(1, "policyName is required"),
  description: z.string().optional().nullable(),
  appliesTo: appliesToEnum.default("selected_components"),
  effect: effectEnum,
  calculationType: calculationTypeEnum,
  percentageRate: z.coerce.number().min(0).max(100).nullable().optional(),
  fixedAmount: moneyNumber.nullable().optional(),
  gracePeriodDays: z.coerce.number().int().min(0).optional().default(0),
  maxCapAmount: moneyNumber.nullable().optional(),
  referenceDateEvent: z.string().optional().nullable(),
  publishStatus: z.enum(["draft", "published"]).optional().default("draft"),
  feeTypeCatalogIds: z.array(positiveIntegerId).optional(),
  courses: z.array(courseScopeItemSchema).optional(),
  batchIds: z.array(positiveIntegerId).optional(),
  batches: z.array(batchInputSchema).optional(),
  slabs: z.array(slabSchema).optional(),
});

const updateFeePolicySchema = z.object({
  feePolicyId: positiveIntegerId,
  policyName: z.string().trim().min(1).optional(),
  description: z.string().optional().nullable(),
  appliesTo: appliesToEnum.optional(),
  effect: effectEnum.optional(),
  calculationType: calculationTypeEnum.optional(),
  percentageRate: z.coerce.number().min(0).max(100).nullable().optional(),
  fixedAmount: moneyNumber.nullable().optional(),
  gracePeriodDays: z.coerce.number().int().min(0).optional(),
  maxCapAmount: moneyNumber.nullable().optional(),
  referenceDateEvent: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  feeTypeCatalogIds: z.array(positiveIntegerId).optional(),
  courses: z.array(courseScopeItemSchema).optional(),
  batchIds: z.array(positiveIntegerId).optional(),
  batches: z.array(batchInputSchema).optional(),
  slabs: z.array(slabSchema).optional(),
});

const policyIdQuerySchema = z.object({
  feePolicyId: positiveIntegerId,
});

const listFeePolicyQuerySchema = z.object({
  publishStatus: z.enum(["all", "draft", "published"]).optional(),
  effect: effectEnum.optional(),
  calculationType: calculationTypeEnum.optional(),
  courseId: positiveIntegerId.optional(),
  batchId: positiveIntegerId.optional(),
  year: positiveIntegerId.optional(),
  term: positiveIntegerId.optional(),
  search: z.string().optional(),
  page: positiveIntegerId.optional(),
  limit: positiveIntegerId.optional(),
});

const publishBodySchema = z.object({
  feePolicyId: positiveIntegerId,
});

// Endpoints
router.post(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value, null),
  validate({ body: createFeePolicySchema }),
  createFeePolicy
);

router.get(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value, null),
  validate({ query: listFeePolicyQuerySchema }),
  getFeePolicies
);

router.get(
  "/single",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value, null),
  validate({ query: policyIdQuerySchema }),
  getSingleFeePolicy
);

router.patch(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value, null),
  validate({ body: updateFeePolicySchema }),
  updateFeePolicy
);

router.patch(
  "/publish",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_PUBLISH.value, null),
  validate({ body: publishBodySchema }),
  publishFeePolicy
);

router.patch(
  "/unpublish",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_PUBLISH.value, null),
  validate({ body: publishBodySchema }),
  unpublishFeePolicy
);

router.delete(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value, null),
  validate({ query: policyIdQuerySchema }),
  deleteFeePolicy
);

export default router;
