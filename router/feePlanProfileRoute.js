import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import * as feePlanProfileRepo from "../repository/feePlanProfileRepository.js";
import {
  addFeePlanProfile,
  getAllFeePlanProfile,
  getSingleFeePlanProfileDetails,
  updateFeePlanProfile,
  deleteFeePlanProfile,
} from "../controllers/feePlanProfileController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const AMOUNT_DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

function preprocessAmountToDecimalString(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === "number" && Number.isFinite(val)) return val.toFixed(2);
  if (typeof val === "string") return val.trim();
  return val;
}

const amountDecimalString = z.preprocess(
  preprocessAmountToDecimalString,
  z
    .string({ required_error: "amount is required" })
    .min(1, { message: "amount is required" })
    .regex(AMOUNT_DECIMAL_RE, {
      message: 'amount must be a non-negative decimal string (e.g. "45.00") with at most 2 fractional digits',
    })
);

const planTypeSchema = z
  .string()
  .trim()
  .transform((raw) => feePlanProfileRepo.normalizePlanType(raw))
  .refine((v) => v != null, {
    message: 'planType must be "annual", "semester", or "trimester"',
  });

const feeTypeCatalogLineSchema = z.object({
  feeTypeCategoryId: positiveIntegerId,
  name: z.string().trim().min(1, { message: "name is required" }),
  amount: amountDecimalString,
});

const feePlanItemSchema = z
  .object({
    name: z.string().trim().min(1, { message: "name is required" }),
    startDate: z.string().trim().min(1, { message: "startDate is required" }),
    dueDate: z.string().trim().optional(),
    amount: amountDecimalString,
    feeTypeCatalogs: z.array(feeTypeCatalogLineSchema).optional(),
  })
  .transform((row) => ({
    name: row.name,
    startDate: row.startDate,
    dueDate: row.dueDate && String(row.dueDate).trim() !== "" ? row.dueDate : null,
    amount: row.amount,
    feeTypeCatalogs: row.feeTypeCatalogs ?? [],
  }));

const feePlanItemsArraySchema = z
  .array(feePlanItemSchema)
  .min(1, { message: "feePlanItems must have at least one installment when provided" });

const createFeePlanProfileBodySchema = z
  .object({
    name: z.string().trim().min(1, { message: "name is required" }),
    planType: planTypeSchema,
    courseSessionId: positiveIntegerId,
    academicYearId: positiveIntegerId.optional(),
    feePlanItems: feePlanItemsArraySchema.optional(),
  })
  .transform((d) => ({
    name: d.name,
    planType: d.planType,
    courseSessionId: d.courseSessionId,
    academicYearId: d.academicYearId,
    feePlanItems: d.feePlanItems ?? [],
  }));

const feePlanProfileIdQuerySchema = z.object({
  feePlanProfileId: positiveIntegerId,
});

const feePlanProfileListQuerySchema = z.object({
  courseSessionId: positiveIntegerId,
});

const updateFeePlanProfileBodySchema = z
  .object({
    feePlanProfileId: positiveIntegerId,
    name: z.string().trim().min(1, { message: "name cannot be empty" }).optional(),
    planType: planTypeSchema.optional(),
    courseSessionId: positiveIntegerId.optional(),
    academicYearId: positiveIntegerId.optional(),
    feePlanItems: feePlanItemsArraySchema.optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.planType !== undefined ||
      d.courseSessionId !== undefined ||
      d.academicYearId !== undefined ||
      (Array.isArray(d.feePlanItems) && d.feePlanItems.length > 0),
    {
      message:
        "Provide at least one of: name, planType, courseSessionId, academicYearId, feePlanItems (non-empty)",
    }
  )
  .refine(
    (d) => {
      if (!Array.isArray(d.feePlanItems) || d.feePlanItems.length === 0) return true;
      return d.name !== undefined && d.planType !== undefined && d.courseSessionId !== undefined;
    },
    {
      message: "When feePlanItems is provided, name, planType, and courseSessionId are required (same as POST)",
    }
  )
  .transform((d) => ({
    feePlanProfileId: d.feePlanProfileId,
    name: d.name,
    planType: d.planType,
    courseSessionId: d.courseSessionId,
    academicYearId: d.academicYearId,
    feePlanItems: d.feePlanItems ?? [],
  }));

router.post("/", userAuth, validate({ body: createFeePlanProfileBodySchema }), addFeePlanProfile);


router.get("/", userAuth, validate({ query: feePlanProfileListQuerySchema }), getAllFeePlanProfile);

router.get("/single", userAuth, validate({ query: feePlanProfileIdQuerySchema }), getSingleFeePlanProfileDetails);

router.patch("/", userAuth, validate({ body: updateFeePlanProfileBodySchema }), updateFeePlanProfile);
router.delete("/", userAuth, validate({ query: feePlanProfileIdQuerySchema }), deleteFeePlanProfile);

export default router;
