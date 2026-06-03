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

const addAssetLocationSchema = z.object({
  classRoomSectionId: positiveIntegerId,
});

const updateAssetLocationSchema = z.object({
  assetLocationId: positiveIntegerId,
  classRoomSectionId: positiveIntegerId,
});

router.post("/", userAuth, validate({ body: addAssetLocationSchema }), addAssetLocation);
router.get("/", userAuth, getAllAssetLocation);
router.get(
  "/single",
  userAuth,
  validate({ query: assetLocationIdQuerySchema }),
  getSingleAssetLocationDetails
);
router.patch("/", userAuth, validate({ body: updateAssetLocationSchema }), updateAssetLocation);
router.delete("/", userAuth, validate({ query: assetLocationIdQuerySchema }), deleteAssetLocation);

export default router;
