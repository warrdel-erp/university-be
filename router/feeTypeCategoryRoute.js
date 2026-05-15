import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addFeeTypeCategory,
  getAllFeeTypeCategory,
  getSingleFeeTypeCategoryDetails,
  updateFeeTypeCategory,
  deleteFeeTypeCategory,
} from "../controllers/feeTypeCategoryController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const feeTypeCategoryIdQuerySchema = z.object({
  feeTypeCategoryId: positiveIntegerId,
});

const addFeeTypeCategorySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
});

const updateFeeTypeCategorySchema = z
  .object({
    feeTypeCategoryId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    description: z.string().optional().nullable(),
  })
  .refine((d) => d.name !== undefined || d.description !== undefined, {
    message: "At least one of name, description is required",
  });

router.post("/", userAuth, validate({ body: addFeeTypeCategorySchema }), addFeeTypeCategory);
router.get("/", userAuth, getAllFeeTypeCategory);
router.get("/single", userAuth, validate({ query: feeTypeCategoryIdQuerySchema }), getSingleFeeTypeCategoryDetails);
router.patch("/", userAuth, validate({ body: updateFeeTypeCategorySchema }), updateFeeTypeCategory);
router.delete("/", userAuth, validate({ query: feeTypeCategoryIdQuerySchema }), deleteFeeTypeCategory);

export default router;
