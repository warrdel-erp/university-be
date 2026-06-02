import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  createLibraryIssueBookTransaction,
  getLibraryIssueBookTransactions,
  getLibraryIssueBookTransactionById,
  updateLibraryIssueBookTransaction,
  getLibraryBookInventoryIssueHistory,
  getLibraryMembersList,
} from "../controllers/libraryIssueBookTransactionController.js";

const router = Router();

const positiveId = z.coerce.number().int().positive();
const memberTypeEnum = z.enum(["STUDENT", "TEACHER"]);

const inventoryItemSchema = z.object({
  inventoryId: positiveId,
});

const issueBookTransactionCreateSchema = z
  .object({
    memberId: positiveId,
    memberType: memberTypeEnum,
    issueDate: z.string(),
    dueDate: z.string(),
    inventoryItems: z.array(inventoryItemSchema).optional(),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "dueDate must be on or after issueDate",
    path: ["dueDate"],
  });

const issueBookTransactionUpdateSchema = z
  .object({
    libraryIssueBookTransactionId: positiveId,
    memberId: positiveId.optional(),
    memberType: memberTypeEnum.optional(),
    issueDate: z.string().optional(),
    dueDate: z.string().optional(),
    inventoryItems: z.array(inventoryItemSchema).optional(),
    returnItems: z
      .array(
        z
          .object({
            libraryBookIssueInventoryItemId: positiveId.optional(),
            inventoryId: positiveId.optional(),
            returnDate: z.string(),
          })
          .refine((data) => data.libraryBookIssueInventoryItemId || data.inventoryId, {
            message: "libraryBookIssueInventoryItemId or inventoryId is required",
          }),
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.dueDate) return true;
      return data.dueDate >= data.issueDate;
    },
    {
      message: "dueDate must be on or after issueDate",
      path: ["dueDate"],
    },
  );

const libraryIssueBookTransactionIdQuerySchema = z.object({
  libraryIssueBookTransactionId: positiveId,
});

const listIssueBookTransactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
});

const inventoryIssueHistoryQuerySchema = z.object({
  inventoryId: positiveId,
});
const memberListQuerySchema = z.object({
  memberType: memberTypeEnum.optional(),
});

router.post(
  "/",
  userAuth,
  validate({ body: issueBookTransactionCreateSchema }),
  createLibraryIssueBookTransaction,
);
router.get(
  "/",
  userAuth,
  validate({ query: listIssueBookTransactionQuerySchema }),
  getLibraryIssueBookTransactions,
);
router.get(
  "/single",
  userAuth,
  validate({ query: libraryIssueBookTransactionIdQuerySchema }),
  getLibraryIssueBookTransactionById,
);
router.get(
  "/inventoryIssueHistory",
  userAuth,
  validate({ query: inventoryIssueHistoryQuerySchema }),
  getLibraryBookInventoryIssueHistory,
);
router.patch(
  "/",
  userAuth,
  validate({ body: issueBookTransactionUpdateSchema }),
  updateLibraryIssueBookTransaction,
);

router.get(
  "/membersList",
  userAuth,
  validate({ query: memberListQuerySchema }),
  getLibraryMembersList,
);

export default router;

