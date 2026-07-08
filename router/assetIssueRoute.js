import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { assetConditions } from "../constant.js";
import {
  addAssetIssue,
  getAllAssetIssues,
  getAssetIssuePaymentsById,
  getAllAssetReturnTransactions,
  getAssetReturnPaymentsById,
  getSingleAssetIssue,
  updateAssetIssue,
  returnAssetIssueItems,
} from "../controllers/assetIssueController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const paymentMethodEnum = z.enum(["credit_card", "bank_transfer", "cash", "cheque"]);
const moneyAmount = z.coerce.string().trim().min(1);

const assetReturnConditionSchema = z.enum(assetConditions, {
  errorMap: () => ({
    message: `returnCondition must be one of: ${assetConditions.join(", ")}`,
  }),
});

const createAssetIssueSchema = z.object({
  memberId: positiveIntegerId,
  memberType: z.enum(["STUDENT", "TEACHER"]),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  securityAmount: moneyAmount.optional(),
  paymentMethod: paymentMethodEnum.optional().default("cash"),
  items: z
    .array(
      z.object({
        assetInventoryItemId: positiveIntegerId,
      })
    )
    .min(1)
    .refine(
      (items) => {
        const ids = new Set();
        for (const item of items) {
          if (ids.has(item.assetInventoryItemId)) {
            return false;
          }
          ids.add(item.assetInventoryItemId);
        }
        return true;
      },
      { message: "Duplicate assetInventoryItemId in items" }
    ),
});

const returnAssetIssueSchema = z
  .object({
    returnDate: z.string().date(),
    securityAmount: moneyAmount.optional(),
    fineAmount: moneyAmount.optional(),
    paymentMethod: paymentMethodEnum.optional().default("cash"),
    items: z
      .array(
        z.object({
          assetIssueInventoryItemId: positiveIntegerId,
          returnCondition: assetReturnConditionSchema,
          damageNotes: z.string().trim().optional().nullable(),
        })
      )
      .min(1),
  })
  .refine(
    (data) =>
      (data.securityAmount === undefined && data.fineAmount === undefined) ||
      (data.securityAmount !== undefined && data.fineAmount !== undefined),
    { message: "securityAmount and fineAmount must be provided together" }
  );

const listAssetIssueQuerySchema = z.object({
  page: z.coerce.number().int("page must be an integer").min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1)
    .max(100)
    .optional()
    .default(20),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

const singleAssetIssueQuerySchema = z.object({
  assetIssueTransactionId: positiveIntegerId,
});

const assetIssuePaymentsQuerySchema = z.object({
  assetIssueTransactionId: positiveIntegerId,
});

const updateAssetIssueSchema = z
  .object({
    assetIssueTransactionId: positiveIntegerId,
    memberId: positiveIntegerId.optional(),
    memberType: z.enum(["STUDENT", "TEACHER"]).optional(),
    issueDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
  })
  .refine(
    (data) =>
      data.memberId !== undefined ||
      data.memberType !== undefined ||
      data.issueDate !== undefined ||
      data.dueDate !== undefined,
    { message: "At least one field is required to update" }
  );

const listAssetReturnQuerySchema = z.object({
  page: z.coerce.number().int("page must be an integer").min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1)
    .max(100)
    .optional()
    .default(20),
});

const assetReturnPaymentsQuerySchema = z.object({
  assetReturnTransactionId: positiveIntegerId,
});

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/", userAuth, checkAccess(PERMISSIONS.ASSET_ISSUE_ADD.value, 'assetIssue'), validate({ body: createAssetIssueSchema }), addAssetIssue);

router.post("/return", userAuth, checkAccess(PERMISSIONS.ASSET_ISSUE_RETURN_ADD.value, 'assetIssueReturn'), validate({ body: returnAssetIssueSchema }), returnAssetIssueItems);
router.get(
  "/return/payments",
  userAuth,
  checkAccess(PERMISSIONS.ASSET_ISSUE_RETURN.value, 'assetIssueReturn'),
  validate({ query: assetReturnPaymentsQuerySchema }),
  getAssetReturnPaymentsById
);
router.get("/return", userAuth, checkAccess(PERMISSIONS.ASSET_ISSUE_RETURN.value, 'assetIssueReturn'), validate({ query: listAssetReturnQuerySchema }), getAllAssetReturnTransactions);
router.get(
  "/payments",
  userAuth,
  checkAccess(PERMISSIONS.ASSET_ISSUE.value, 'assetIssue'),
  validate({ query: assetIssuePaymentsQuerySchema }),
  getAssetIssuePaymentsById
);
router.get("/", userAuth, checkAccess(PERMISSIONS.ASSET_ISSUE.value, 'assetIssue'), validate({ query: listAssetIssueQuerySchema }), getAllAssetIssues);

router.get("/single", userAuth, checkAccess(PERMISSIONS.ASSET_ISSUE.value, 'assetIssue'), validate({ query: singleAssetIssueQuerySchema }), getSingleAssetIssue);
router.patch("/", userAuth, checkAccess(PERMISSIONS.ASSET_ISSUE_EDIT.value, 'assetIssue'), validate({ body: updateAssetIssueSchema }), updateAssetIssue);

export default router;
