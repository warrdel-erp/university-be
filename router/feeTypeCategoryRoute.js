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
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

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

router.post("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE_ADD.value, null), validate({ body: addFeeTypeCategorySchema }), addFeeTypeCategory);
router.get("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE.value, null), getAllFeeTypeCategory);
router.get("/single", userAuth, checkAccess(PERMISSIONS.FEES_TYPE.value, null), validate({ query: feeTypeCategoryIdQuerySchema }), getSingleFeeTypeCategoryDetails);
router.patch("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE_EDIT.value, null), validate({ body: updateFeeTypeCategorySchema }), updateFeeTypeCategory);
router.delete("/", userAuth, checkAccess(PERMISSIONS.FEES_TYPE_DELETE.value, null), validate({ query: feeTypeCategoryIdQuerySchema }), deleteFeeTypeCategory);

export default router;
