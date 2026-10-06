import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import { getStudentBillingBreakdown } from "../controllers/studentBillingBreakdownController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

export const studentBillingBreakdownQuerySchema = z
  .object({
    studentId: positiveIntegerId,
    billingScheduleItemId: positiveIntegerId.optional(),
    feePlanItemId: positiveIntegerId.optional(),
  })
  .refine(
    (data) => Boolean(data.billingScheduleItemId || data.feePlanItemId),
    {
      message: "Either billingScheduleItemId or feePlanItemId is required",
      path: ["billingScheduleItemId"],
    }
  );

router.get(
  "/",
  userAuth,
  validate({ query: studentBillingBreakdownQuerySchema }),
  getStudentBillingBreakdown
);

router.get(
  "/details",
  userAuth,
  validate({ query: studentBillingBreakdownQuerySchema }),
  getStudentBillingBreakdown
);

export default router;
