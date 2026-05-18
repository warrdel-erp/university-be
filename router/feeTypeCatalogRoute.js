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

const router = Router();

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
  description: z.string().trim().optional().nullable(),
});

const updateFeeTypeCatalogSchema = z
  .object({
    feeTypeCatalogId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    description: z.string().optional().nullable(),
    amount: amountString.optional(),
    feeTypeCategoryId: positiveIntegerId.optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.amount !== undefined ||
      d.feeTypeCategoryId !== undefined,
    { message: "At least one of name, description, amount, feeTypeCategoryId is required" }
  );

router.post("/", userAuth, validate({ body: addFeeTypeCatalogSchema }), addFeeTypeCatalog);
router.get("/", userAuth, getAllFeeTypeCatalog);
router.get("/single", userAuth, validate({ query: feeTypeCatalogIdQuerySchema }), getSingleFeeTypeCatalogDetails);
router.patch("/", userAuth, validate({ body: updateFeeTypeCatalogSchema }), updateFeeTypeCatalog);
router.delete("/", userAuth, validate({ query: feeTypeCatalogIdQuerySchema }), deleteFeeTypeCatalog);

export default router;
