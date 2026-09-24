import { Router } from "express";
import { z } from "zod";
import {
  getFeePlanBatches,
  getBatchFeePlanOverview,
  getBatchFeePlanYear,
  getBatchBillingDetails,
  createFeePlanItem,
  updateFeePlanItem,
  deleteFeePlanItem,
  addFeePlanSubItem,
  deleteFeePlanSubItem,
  publishBatchFeePlanYear,
  unpublishBatchFeePlanYear,
  getFeePlanPublishHistory,
  getFeePlanPublishHistoryById,
  getSingleFeePlanItemDetails,
} from "../controllers/feePlanItemController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number()
  .int("id must be an integer")
  .positive("id must be greater than 0");

const singleFeePlanItemQuerySchema = z.object({
  feePlanItemId: positiveIntegerId,
  page: positiveIntegerId.optional(),
  limit: positiveIntegerId.optional(),
});

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const amount = z.coerce.string().trim().min(1);

const feePlanStatusEnum = z.enum([
  "Published",
  "In Review",
  "Draft",
  "Setup Required",
]);

const feePlanSubItemLine = z
  .object({
    feeTypeCatalogId: positiveIntegerId,
    amount,
    isMainSubItem: z.boolean().optional(),
    isMainItem: z.boolean().optional(),
  })
  .transform((line) => ({
    feeTypeCatalogId: line.feeTypeCatalogId,
    amount: line.amount,
    isMainSubItem: line.isMainSubItem === true || line.isMainItem === true,
  }));

const assertUniqueFeeTypeCatalogIds = (feePlanSubItems, ctx) => {
  const ids = [];
  for (const line of feePlanSubItems) {
    ids.push(line.feeTypeCatalogId);
  }
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "feePlanSubItems must not contain duplicate feeTypeCatalogId",
      path: ["feePlanSubItems"],
    });
  }
};

const feePlanBatchesQuerySchema = z.object({
  courseId: positiveIntegerId.optional(),
  sessionId: positiveIntegerId.optional(),
  search: z.string().trim().optional(),
  status: feePlanStatusEnum.optional(),
});

const batchOverviewQuerySchema = z.object({
  batchId: positiveIntegerId,
});

const batchYearQuerySchema = z.object({
  batchId: positiveIntegerId,
  year: positiveIntegerId,
});

const createFeePlanItemBodySchema = z
  .object({
    batchId: positiveIntegerId,
    year: positiveIntegerId,
    name: z.string().trim().min(1),
    academicPeriod: z.string().trim().min(1),
    createDate: dateOnly,
    dueDate: dateOnly.optional().nullable(),
    feePlanSubItems: z.array(feePlanSubItemLine).min(1),
  })
  .superRefine((body, ctx) =>
    assertUniqueFeeTypeCatalogIds(body.feePlanSubItems, ctx),
  );

const updateFeePlanItemBodySchema = z
  .object({
    feePlanItemId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    academicPeriod: z.string().trim().min(1).optional(),
    createDate: dateOnly.optional(),
    dueDate: dateOnly.optional().nullable(),
    year: positiveIntegerId.optional(),
    feePlanSubItems: z.array(feePlanSubItemLine).min(1).optional(),
  })
  .superRefine((body, ctx) => {
    const hasUpdate =
      body.name !== undefined ||
      body.academicPeriod !== undefined ||
      body.createDate !== undefined ||
      body.dueDate !== undefined ||
      body.year !== undefined ||
      body.feePlanSubItems !== undefined;

    if (!hasUpdate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one field to update is required besides feePlanItemId",
      });
    }

    if (body.feePlanSubItems !== undefined) {
      assertUniqueFeeTypeCatalogIds(body.feePlanSubItems, ctx);
    }
  });

const deleteFeePlanItemQuerySchema = z.object({
  feePlanItemId: positiveIntegerId,
});

const addFeePlanSubItemBodySchema = z
  .object({
    feePlanItemId: positiveIntegerId,
    feeTypeCatalogId: positiveIntegerId,
    amount,
    isMainSubItem: z.boolean().optional(),
    isMainItem: z.boolean().optional(),
  })
  .transform((body) => ({
    feePlanItemId: body.feePlanItemId,
    feeTypeCatalogId: body.feeTypeCatalogId,
    amount: body.amount,
    isMainSubItem: body.isMainSubItem === true || body.isMainItem === true,
  }));

const deleteFeePlanSubItemQuerySchema = z.object({
  feePlanSubitemId: positiveIntegerId,
});

const publishYearBodySchema = z.object({
  batchId: positiveIntegerId,
  year: positiveIntegerId,
});

const publishHistoryQuerySchema = z.object({
  batchId: positiveIntegerId,
  year: positiveIntegerId.optional(),
});

const publishHistorySingleQuerySchema = z.object({
  feePlanPublishHistoryId: positiveIntegerId,
});

router.get(
  "/batches",
  userAuth,
  validate({ query: feePlanBatchesQuerySchema }),
  getFeePlanBatches,
);

router.get(
  "/batches/overview",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: batchOverviewQuerySchema }),
  getBatchFeePlanOverview,
);

router.get(
  "/batches/year",
  userAuth,
  validate({ query: batchYearQuerySchema }),
  getBatchFeePlanYear,
);

router.get(
  "/batches/billing",
  userAuth,
  validate({ query: batchYearQuerySchema }),
  getBatchBillingDetails,
);

router.post(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: createFeePlanItemBodySchema }),
  createFeePlanItem,
);

router.patch(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value),
  validate({ body: updateFeePlanItemBodySchema }),
  updateFeePlanItem,
);

router.delete(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: deleteFeePlanItemQuerySchema }),
  deleteFeePlanItem,
);

router.post(
  "/subItem",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: addFeePlanSubItemBodySchema }),
  addFeePlanSubItem,
);

router.delete(
  "/subItem",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: deleteFeePlanSubItemQuerySchema }),
  deleteFeePlanSubItem,
);

router.patch(
  "/publish",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_PUBLISH.value),
  validate({ body: publishYearBodySchema }),
  publishBatchFeePlanYear,
);

router.patch(
  "/unpublish",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_PUBLISH.value),
  validate({ body: publishYearBodySchema }),
  unpublishBatchFeePlanYear,
);

router.get(
  "/publishHistory",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: publishHistoryQuerySchema }),
  getFeePlanPublishHistory,
);

router.get(
  "/publishHistory/single",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: publishHistorySingleQuerySchema }),
  getFeePlanPublishHistoryById,
);

router.get(
  "/single",
  userAuth,
  validate({ query: singleFeePlanItemQuerySchema }),
  getSingleFeePlanItemDetails,
);

export default router;
