import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { assetConditions } from "../constant.js";
import {
  addAsset,
  getAllAsset,
  getSingleAssetDetails,
  updateAsset,
  deleteAsset,
  deleteAssetInventoryItem,
} from "../controllers/assetController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const assetConditionSchema = z.enum(assetConditions, {
  errorMap: () => ({ message: `condition must be one of: ${assetConditions.join(", ")}` }),
});

const assetIdQuerySchema = z.object({
  assetId: positiveIntegerId,
});

const assetInventoryItemIdQuerySchema = z.object({
  assetInventoryItemId: positiveIntegerId,
});

const inventoryRowSchema = z.object({
  locationId: positiveIntegerId.optional().nullable(),
});

const updateInventoryRowSchema = z.object({
  assetInventoryItemId: positiveIntegerId,
  locationId: z.union([positiveIntegerId, z.null()]),
});

const inventoryItemSchema = z.union([updateInventoryRowSchema, inventoryRowSchema]);

const addAssetSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  condition: assetConditionSchema,
  description: z.string().trim().optional().nullable(),
  departmentId: positiveIntegerId,
  assetCategoryId: positiveIntegerId,
  inventory: z.union([inventoryRowSchema, z.array(inventoryRowSchema)]).optional(),
});

const updateAssetSchema = z
  .object({
    assetId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    condition: assetConditionSchema.optional(),
    description: z.string().optional().nullable(),
    departmentId: positiveIntegerId.optional(),
    assetCategoryId: positiveIntegerId.optional(),
    inMaintenance: z.boolean().optional(),
    inventory: z.array(inventoryItemSchema).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.code !== undefined ||
      d.condition !== undefined ||
      d.description !== undefined ||
      d.departmentId !== undefined ||
      d.assetCategoryId !== undefined ||
      d.inMaintenance !== undefined ||
      (d.inventory !== undefined && d.inventory.length > 0),
    { message: "At least one field is required to update" }
  );

router.post("/", userAuth, validate({ body: addAssetSchema }), addAsset);
router.get("/", userAuth, getAllAsset);
router.get("/single", userAuth, validate({ query: assetIdQuerySchema }), getSingleAssetDetails);
router.patch("/", userAuth, validate({ body: updateAssetSchema }), updateAsset);
router.delete("/", userAuth, validate({ query: assetIdQuerySchema }), deleteAsset);
router.delete(
  "/inventory",
  userAuth,
  validate({ query: assetInventoryItemIdQuerySchema }),
  deleteAssetInventoryItem
);

export default router;
