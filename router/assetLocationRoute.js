import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addAssetLocation,
  getAllAssetLocation,
  getSingleAssetLocationDetails,
  updateAssetLocation,
  deleteAssetLocation,
} from "../controllers/assetLocationController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const assetLocationIdQuerySchema = z.object({
  assetLocationId: positiveIntegerId,
});

const listAssetLocationQuerySchema = z.object({
  assetId: positiveIntegerId.optional(),
});

const addAssetLocationSchema = z.object({
  assetId: positiveIntegerId,
  classRoomSectionId: positiveIntegerId,
  count: positiveIntegerId,
});

const updateAssetLocationSchema = z
  .object({
    assetLocationId: positiveIntegerId,
    assetId: positiveIntegerId.optional(),
    classRoomSectionId: positiveIntegerId.optional(),
    count: positiveIntegerId.optional(),
  })
  .refine((d) => {
    return (
      d.assetId !== undefined ||
      d.classRoomSectionId !== undefined ||
      d.count !== undefined
    );
  }, {
    message: "At least one of assetId, classRoomSectionId, or count is required",
  });

router.post("/", userAuth, validate({ body: addAssetLocationSchema }), addAssetLocation);
router.get("/", userAuth, validate({ query: listAssetLocationQuerySchema }), getAllAssetLocation);
router.get(
  "/single",
  userAuth,
  validate({ query: assetLocationIdQuerySchema }),
  getSingleAssetLocationDetails
);
router.patch("/", userAuth, validate({ body: updateAssetLocationSchema }), updateAssetLocation);
router.delete(
  "/",
  userAuth,
  validate({ query: assetLocationIdQuerySchema }),
  deleteAssetLocation
);

export default router;
