import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addAssetIssue,
  getAllAssetIssues,
  getSingleAssetIssue,
  updateAssetIssue,
} from "../controllers/assetIssueController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const createAssetIssueSchema = z.object({
  memberId: positiveIntegerId,
  memberType: z.enum(["STUDENT", "TEACHER"]),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  remarks: z.string().trim().optional().nullable(),
  items: z.array(
    z.object({
      assetId: positiveIntegerId,
      remarks: z.string().trim().optional().nullable(),
    })
  ).min(1),
});

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
  assetIssueId: positiveIntegerId,
});

const updateAssetIssueSchema = z
  .object({
    assetIssueId: positiveIntegerId,
    memberId: positiveIntegerId.optional(),
    memberType: z.enum(["STUDENT", "TEACHER"]).optional(),
    issueDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    remarks: z.string().trim().optional().nullable(),
    items: z
      .array(
        z.object({
          assetIssueItemId: positiveIntegerId,
          assetId: positiveIntegerId.optional(),
          returnDate: z.string().date().optional().nullable(),
          remarks: z.string().trim().optional().nullable(),
        })
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.memberId !== undefined ||
      data.memberType !== undefined ||
      data.issueDate !== undefined ||
      data.dueDate !== undefined ||
      data.remarks !== undefined ||
      data.items !== undefined,
    { message: "At least one field is required to update" }
  );

router.post("/", userAuth, validate({ body: createAssetIssueSchema }), addAssetIssue);
router.get("/", userAuth, validate({ query: listAssetIssueQuerySchema }), getAllAssetIssues);
router.get("/single", userAuth, validate({ query: singleAssetIssueQuerySchema }), getSingleAssetIssue);
router.patch("/", userAuth, validate({ body: updateAssetIssueSchema }), updateAssetIssue);

export default router;
