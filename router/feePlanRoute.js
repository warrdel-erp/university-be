import { Router } from "express";

const router = Router();

import {
  addFeePlan,
  getAllFeePlan,
  getSingleFeePlanDetails,
  updateFeePlan,
  deleteFeePlan,
  updateFeePlanById,
} from "../controllers/feePlanController.js";

import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { z } from "zod";

const updateFeePlanByIdParamsSchema = z
  .object({
    feePlanId: z.coerce
      .number({ required_error: "feePlanId is required" })
      .int()
      .positive(),
  })
  .strict();

router.post("/", userAuth, addFeePlan);

router.get("/", userAuth, getAllFeePlan);

router.get("/single", userAuth, getSingleFeePlanDetails);

router.patch("/", userAuth, updateFeePlan);

router.delete("/", userAuth, deleteFeePlan);

router.patch(
  "/:feePlanId",
  userAuth,
  validate({ params: updateFeePlanByIdParamsSchema }),
  updateFeePlanById
);

export default router;
