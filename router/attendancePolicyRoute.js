import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import * as controller from "../controllers/attendancePolicyController.js";

const router = Router();

// Validation Schemas
const positiveIntegerId = z.coerce.number().int().positive();

const step1Schema = z.object({
  policyId: positiveIntegerId.optional(),
  policyName: z.string().min(1, "Policy name is required"),
  policyCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  versionNumber: z.string().default("v1.0").optional(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveTo: z.string().optional().nullable(),
  applicableSchedule: z.string().default("General Shift").optional(),
  mappings: z
    .array(
      z.object({
        roleId: positiveIntegerId.optional().nullable(),
        departmentId: positiveIntegerId.optional().nullable(),
        employeeId: positiveIntegerId.optional().nullable(),
      })
    )
    .optional(),
});

const step2Schema = z.object({
  minFullDayMinutes: z.coerce.number().int().min(60).default(450),
  minHalfDayMinutes: z.coerce.number().int().min(30).default(240),
  considerBreakTime: z.boolean().default(false).optional(),
  missingPunchAction: z.enum(["PENDING_REVIEW", "TREAT_AS_ABSENT"]).default("PENDING_REVIEW"),
  autoMarkAbsentAfterDays: z.coerce.number().int().min(0).default(3).optional().nullable(),
  countFullDayOdAsPresent: z.boolean().default(true).optional(),
  countHalfDayOdAsPresent: z.boolean().default(true).optional(),
  requireOdApproval: z.boolean().default(true).optional(),
  allowRegularisation: z.boolean().default(true).optional(),
  regularisationWindowDays: z.coerce.number().int().min(1).default(7).optional().nullable(),
});

const penaltySlabSchema = z.object({
  violationType: z.enum(["LATE_ENTRY", "EARLY_EXIT", "COMBINED"]),
  fromOccurrence: z.coerce.number().int().min(1),
  toOccurrence: z.coerce.number().int().min(1).optional().nullable(),
  attendanceImpact: z.enum(["NO_IMPACT", "HALF_DAY", "FULL_DAY", "LOP"]).default("NO_IMPACT"),
  penaltyApplication: z.enum(["AT_THRESHOLD", "EVERY_OCCURRENCE"]).default("AT_THRESHOLD"),
});

const step3Schema = z.object({
  enableLateEntry: z.boolean().default(true).optional(),
  lateGracePeriodMinutes: z.coerce.number().int().min(0).default(10),
  lateCountCycle: z.enum(["CALENDAR_MONTH", "PAY_CYCLE", "WEEKLY"]).default("CALENDAR_MONTH"),
  enableEarlyExit: z.boolean().default(true).optional(),
  earlyGracePeriodMinutes: z.coerce.number().int().min(0).default(10),
  earlyCountCycle: z.enum(["CALENDAR_MONTH", "PAY_CYCLE", "WEEKLY"]).default("CALENDAR_MONTH"),
  violationCountingType: z.enum(["SEPARATE", "COMBINED"]).default("SEPARATE"),
  enableExcessiveViolation: z.boolean().default(false).optional(),
  excessiveLateThresholdMin: z.coerce.number().int().min(0).default(120).optional().nullable(),
  excessiveLatePenalty: z.enum(["NO_IMPACT", "HALF_DAY", "FULL_DAY", "LOP"]).default("HALF_DAY").optional().nullable(),
  excessiveEarlyThresholdMin: z.coerce.number().int().min(0).default(120).optional().nullable(),
  excessiveEarlyPenalty: z.enum(["NO_IMPACT", "HALF_DAY", "FULL_DAY", "LOP"]).default("HALF_DAY").optional().nullable(),
  excludeApprovedExceptions: z.boolean().default(true).optional(),
  maxDailyPenaltyDays: z.coerce.number().min(0).max(2).default(1.00),
  penaltySlabs: z.array(penaltySlabSchema).optional(),
});

const duplicateSchema = z.object({
  newPolicyName: z.string().optional(),
  newPolicyCode: z.string().optional().nullable(),
});

const createVersionSchema = z.object({
  versionNumber: z.string().min(1),
  effectiveFrom: z.string().optional().nullable(),
  policyCode: z.string().optional().nullable(),
});

// Routes
router.use(userAuth);

router.get("/metrics", controller.getMetrics);
router.get("/", controller.getPolicies);
router.get("/:policyId", validate({ params: z.object({ policyId: positiveIntegerId }) }), controller.getSinglePolicy);

// Wizard Steps
router.post("/step-1", validate({ body: step1Schema }), controller.saveStep1);
router.put("/:policyId/step-1", validate({ params: z.object({ policyId: positiveIntegerId }), body: step1Schema }), controller.saveStep1);
router.put("/:policyId/step-2", validate({ params: z.object({ policyId: positiveIntegerId }), body: step2Schema }), controller.saveStep2);
router.put("/:policyId/step-3", validate({ params: z.object({ policyId: positiveIntegerId }), body: step3Schema }), controller.saveStep3);
router.patch("/:policyId/publish", validate({ params: z.object({ policyId: positiveIntegerId }) }), controller.publishPolicy);

// Management Actions
router.post("/:policyId/duplicate", validate({ params: z.object({ policyId: positiveIntegerId }), body: duplicateSchema }), controller.duplicatePolicy);
router.post("/:policyId/create-version", validate({ params: z.object({ policyId: positiveIntegerId }), body: createVersionSchema }), controller.createNewVersion);
router.patch("/:policyId/archive", validate({ params: z.object({ policyId: positiveIntegerId }) }), controller.archivePolicy);
router.delete("/:policyId", validate({ params: z.object({ policyId: positiveIntegerId }) }), controller.deletePolicy);

export default router;
