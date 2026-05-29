import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { assetStatuses, assetConditions } from "../constant.js";
import {
  addAsset,
  getAllAsset,
  getSingleAssetDetails,
  updateAsset,
  deleteAsset,
} from "../controllers/assetController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const assetStatusSchema = z.enum(assetStatuses, {
  errorMap: () => ({ message: `status must be one of: ${assetStatuses.join(", ")}` }),
});

const assetConditionSchema = z.enum(assetConditions, {
  errorMap: () => ({ message: `condition must be one of: ${assetConditions.join(", ")}` }),
});

const assetIdQuerySchema = z.object({
  assetId: positiveIntegerId,
});

const addAssetSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  status: assetStatusSchema,
  condition: assetConditionSchema,
  description: z.string().trim().optional().nullable(),
  departmentId: positiveIntegerId,
  assetCategoryId: positiveIntegerId,
});

const updateAssetSchema = z
  .object({
    assetId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    status: assetStatusSchema.optional(),
    condition: assetConditionSchema.optional(),
    description: z.string().optional().nullable(),
    departmentId: positiveIntegerId.optional(),
    assetCategoryId: positiveIntegerId.optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.code !== undefined ||
      d.status !== undefined ||
      d.condition !== undefined ||
      d.description !== undefined ||
      d.departmentId !== undefined ||
      d.assetCategoryId !== undefined,
    { message: "At least one field is required to update" }
  );

router.post("/", userAuth, validate({ body: addAssetSchema }), addAsset);
router.get("/", userAuth, getAllAsset);
router.get("/single", userAuth, validate({ query: assetIdQuerySchema }), getSingleAssetDetails);
router.patch("/", userAuth, validate({ body: updateAssetSchema }), updateAsset);
router.delete("/", userAuth, validate({ query: assetIdQuerySchema }), deleteAsset);

export default router;
