import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { assetConditions, assetInventoryStatuses } from "../constant.js";
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

const assetInventoryStatusSchema = z.enum(assetInventoryStatuses, {
  errorMap: () => ({
    message: `status must be one of: ${assetInventoryStatuses.join(", ")}`,
  }),
});

const assetIdQuerySchema = z.object({
  assetId: positiveIntegerId,
});

const listAssetQuerySchema = z.object({
  page: z.coerce.number().int("page must be an integer").min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1)
    .max(100)
    .optional()
    .default(20),
  status: z
    .enum(["all", "assigned", "unassigned"], {
      errorMap: () => ({
        message: 'status must be one of: all, assigned, unassigned',
      }),
    })
    .optional()
    .default("all"),
});

const assetInventoryItemIdQuerySchema = z.object({
  assetInventoryItemId: positiveIntegerId,
});

const inventoryBulkRowSchema = z.object({
  count: z.coerce
    .number({ invalid_type_error: "count must be a number" })
    .int({ message: "count must be an integer" })
    .min(1, { message: "count must be at least 1" })
    .max(5000, { message: "count cannot exceed 5000" }),
  classRoomSectionId: z.union([positiveIntegerId, z.null()]).optional(),
});

const inventoryBulkField = {
  inventoryBulk: z.array(inventoryBulkRowSchema).min(1).max(50).optional(),
};

const addAssetSchema = z.object({
  name: z.string().trim().min(1),
  condition: assetConditionSchema,
  description: z.string().trim().optional().nullable(),
  assetCategoryId: positiveIntegerId,
  ...inventoryBulkField,
});

const updateAssetSchema = z
  .object({
    assetId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    condition: assetConditionSchema.optional(),
    description: z.string().optional().nullable(),
    assetCategoryId: positiveIntegerId.optional(),
    ...inventoryBulkField,
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.condition !== undefined ||
      d.description !== undefined ||
      d.assetCategoryId !== undefined ||
      d.inventoryBulk !== undefined,
    { message: "At least one field is required to update" }
  );

router.post("/", userAuth, validate({ body: addAssetSchema }), addAsset);

router.get("/", userAuth, validate({ query: listAssetQuerySchema }), getAllAsset);
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
