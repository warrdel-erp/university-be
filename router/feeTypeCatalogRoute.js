import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addFeeTypeCatalog,
  getAllFeeTypeCatalog,
  getSingleFeeTypeCatalogDetails,
  updateFeeTypeCatalog,
  deleteFeeTypeCatalog,
} from "../controllers/feeTypeCatalogController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { feeTypeLedgerTypes } from "../constant.js";

const router = Router();

const ledgerTypeSchema = z.enum(feeTypeLedgerTypes, {
  errorMap: () => ({
    message: `ledgerType must be one of: ${feeTypeLedgerTypes.join(", ")}`,
  }),
});

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

/** Decimal money as string (e.g. `"70.00"`); numbers from JSON are coerced to string. */
const amountString = z.coerce
  .string({ invalid_type_error: "amount is required" })
  .trim()
  .min(1, { message: "amount is required" });

const feeTypeCatalogIdQuerySchema = z.object({
  feeTypeCatalogId: positiveIntegerId,
});

const addFeeTypeCatalogSchema = z.object({
  name: z.string().trim().min(1),
  amount: amountString,
  feeTypeCategoryId: positiveIntegerId,
  ledgerType: ledgerTypeSchema,
  description: z.string().trim().optional().nullable(),
});

const updateFeeTypeCatalogSchema = z
  .object({
    feeTypeCatalogId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    description: z.string().optional().nullable(),
    amount: amountString.optional(),
    feeTypeCategoryId: positiveIntegerId.optional(),
    ledgerType: ledgerTypeSchema.optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.amount !== undefined ||
      d.feeTypeCategoryId !== undefined ||
      d.ledgerType !== undefined,
    {
      message:
        "At least one of name, description, amount, feeTypeCategoryId, ledgerType is required",
    }
  );

router.post("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE_ADD.value, null), validate({ body: addFeeTypeCatalogSchema }), addFeeTypeCatalog);
router.get("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE.value, null), getAllFeeTypeCatalog);
router.get("/single", userAuth, checkAccess(PERMISSIONS.FEES_TYPE.value, null), validate({ query: feeTypeCatalogIdQuerySchema }), getSingleFeeTypeCatalogDetails);
router.patch("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE_EDIT.value, null), validate({ body: updateFeeTypeCatalogSchema }), updateFeeTypeCatalog);
router.delete("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE_DELETE.value, null), validate({ query: feeTypeCatalogIdQuerySchema }), deleteFeeTypeCatalog);

export default router;
