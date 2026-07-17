import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import { assetConditions, assetInventoryStatuses } from "../constant.js";
import {
  addAsset,
  getAllAsset,
  getSingleAssetDetails,
  previewAssetCode,
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

const assetCodePreviewQuerySchema = z.object({
  name: z.string().trim().min(1),
  assetCategoryId: positiveIntegerId,
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
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
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

const inventoryAssignRowSchema = z.object({
  assetInventoryItemId: positiveIntegerId,
  classRoomSectionId: positiveIntegerId,
});

const inventoryAssignField = {
  inventory: z.array(inventoryAssignRowSchema).min(1).max(100).optional(),
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
    ...inventoryAssignField,
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.condition !== undefined ||
      d.description !== undefined ||
      d.assetCategoryId !== undefined ||
      d.inventoryBulk !== undefined ||
      d.inventory !== undefined,
    { message: "At least one field is required to update" }
  );

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/", userAuth, checkAccess(PERMISSIONS.ASSET_MANAGEMENT_ADD.value, 'asset'), validate({ body: addAssetSchema }), addAsset);

router.get("/", userAuth, checkAccess(PERMISSIONS.ASSET_MANAGEMENT.value, 'asset'), validate({ query: listAssetQuerySchema }), getAllAsset);
router.get(
  "/codepreview",
  userAuth,
  checkAccess(PERMISSIONS.ASSET_MANAGEMENT_ADD.value, 'asset'),
  validate({ query: assetCodePreviewQuerySchema }),
  previewAssetCode
);
router.get("/single", userAuth, checkAccess(PERMISSIONS.ASSET_MANAGEMENT.value, 'asset'), validate({ query: assetIdQuerySchema }), getSingleAssetDetails);
router.patch("/", userAuth, checkAccess(PERMISSIONS.ASSET_MANAGEMENT_EDIT.value, 'asset'), validate({ body: updateAssetSchema }), updateAsset);
router.delete("/", userAuth, checkAccess(PERMISSIONS.ASSET_MANAGEMENT_DELETE.value, 'asset'), validate({ query: assetIdQuerySchema }), deleteAsset);
router.delete(
  "/inventory",
  userAuth,
  checkAccess(PERMISSIONS.ASSET_MANAGEMENT_DELETE.value, 'asset'),
  validate({ query: assetInventoryItemIdQuerySchema }),
  deleteAssetInventoryItem
);

export default router;
