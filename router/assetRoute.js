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

const inventoryRowSchema = z.object({
  classRoomSectionId: positiveIntegerId.optional().nullable(),
});

const updateInventoryRowSchema = z.object({
  assetInventoryItemId: positiveIntegerId,
  classRoomSectionId: z.union([positiveIntegerId, z.null()]),
});

const inventoryItemSchema = z.union([updateInventoryRowSchema, inventoryRowSchema]);

const inventoryBulkRowSchema = z.object({
  count: z.coerce
    .number({ invalid_type_error: "count must be a number" })
    .int({ message: "count must be an integer" })
    .min(1, { message: "count must be at least 1" })
    .max(500, { message: "count cannot exceed 500" }),
  classRoomSectionId: z.union([positiveIntegerId, z.null()]).optional(),
});

const addAssetSchema = z
  .object({
    name: z.string().trim().min(1),
    code: z.string().trim().min(1),
    condition: assetConditionSchema,
    description: z.string().trim().optional().nullable(),
    assetCategoryId: positiveIntegerId,
    count: z.coerce
      .number({ invalid_type_error: "count must be a number" })
      .int({ message: "count must be an integer" })
      .min(1, { message: "count must be at least 1" })
      .max(5000, { message: "count cannot exceed 500" })
      .optional(),
    classRoomSectionId: z.union([positiveIntegerId, z.null()]).optional(),
    inventoryBulk: z.array(inventoryBulkRowSchema).min(1).max(50).optional(),
    inventory: z.union([inventoryRowSchema, z.array(inventoryRowSchema)]).optional(),
  })
  .refine(
    (data) => {
      const modes = [
        data.inventoryBulk !== undefined,
        data.count !== undefined,
        data.inventory !== undefined,
      ].filter(Boolean).length;
      return modes <= 1;
    },
    { message: "Use only one of: inventoryBulk, count, or inventory" }
  )
  .refine(
    (data) => data.classRoomSectionId === undefined || data.count !== undefined,
    { message: "classRoomSectionId on create is only allowed with count (single batch)" }
  );

const updateAssetSchema = z
  .object({
    assetId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    condition: assetConditionSchema.optional(),
    description: z.string().optional().nullable(),
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
      d.assetCategoryId !== undefined ||
      d.inMaintenance !== undefined ||
      (d.inventory !== undefined && d.inventory.length > 0),
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
