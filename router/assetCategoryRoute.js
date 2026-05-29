import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addAssetCategory,
  getAllAssetCategory,
  getSingleAssetCategoryDetails,
  updateAssetCategory,
  deleteAssetCategory,
} from "../controllers/assetCategoryController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const assetCategoryIdQuerySchema = z.object({
  assetCategoryId: positiveIntegerId,
});

const addAssetCategorySchema = z.object({
  name: z.string().trim().min(1),
});

const updateAssetCategorySchema = z
  .object({
    assetCategoryId: positiveIntegerId,
    name: z.string().trim().min(1).optional(),
  })
  .refine((d) => d.name !== undefined, {
    message: "At least one of name is required",
  });

router.post("/", userAuth, validate({ body: addAssetCategorySchema }), addAssetCategory);
router.get("/", userAuth, getAllAssetCategory);
router.get(
  "/single",
  userAuth,
  validate({ query: assetCategoryIdQuerySchema }),
  getSingleAssetCategoryDetails
);
router.patch("/", userAuth, validate({ body: updateAssetCategorySchema }), updateAssetCategory);
router.delete(
  "/",
  userAuth,
  validate({ query: assetCategoryIdQuerySchema }),
  deleteAssetCategory
);

export default router;
