import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  amcContractApprovalStatuses,
  amcContractStatuses,
  amcContractTypes,
  amcPaymentTerms,
  amcServiceVisitFrequencies,
  amcSlaResolutionHours,
  amcSlaResponseHours,
} from "../constant.js";
import {
  addAmcContract,
  getAllAmcContract,
  getSingleAmcContractDetails,
  updateAmcContract,
  deleteAmcContract,
  previewAmcContractNumber,
  submitAmcContractForApproval,
  approveAmcContract,
  getAmcContractSummary,
} from "../controllers/amcContractController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const optionalTrimmedString = z.string().trim().optional().nullable();

const moneyField = z.union([z.string(), z.number()]);

const contractDateField = z.string().date();

const contractTypeField = z.enum(amcContractTypes, {
  errorMap: () => ({ message: `contractType must be one of: ${amcContractTypes.join(", ")}` }),
});

const approvalStatusField = z.enum(amcContractApprovalStatuses, {
  errorMap: () => ({
    message: `approvalStatus must be one of: ${amcContractApprovalStatuses.join(", ")}`,
  }),
});

const paymentTermsField = z.enum(amcPaymentTerms, {
  errorMap: () => ({ message: `paymentTerms must be one of: ${amcPaymentTerms.join(", ")}` }),
});

const serviceVisitFrequencyField = z.enum(amcServiceVisitFrequencies, {
  errorMap: () => ({
    message: `serviceVisitFrequency must be one of: ${amcServiceVisitFrequencies.join(", ")}`,
  }),
});

const slaResponseHoursField = z.coerce
  .number()
  .int()
  .refine((v) => amcSlaResponseHours.includes(v), {
    message: `slaResponseHours must be one of: ${amcSlaResponseHours.join(", ")}`,
  });

const slaResolutionHoursField = z.coerce
  .number()
  .int()
  .refine((v) => amcSlaResolutionHours.includes(v), {
    message: `slaResolutionHours must be one of: ${amcSlaResolutionHours.join(", ")}`,
  });

const dateRangeRefine = (data) => data.endDate >= data.startDate;

const amcContractIdQuerySchema = z.object({
  amcContractId: positiveIntegerId,
});

const amcContractIdBodySchema = z.object({
  amcContractId: positiveIntegerId,
});

const expiryStatusField = z.enum(amcContractStatuses, {
  errorMap: () => ({ message: `status must be one of: ${amcContractStatuses.join(", ")}` }),
});

const emptyToUndefined = (value) => (value === "" || value === null ? undefined : value);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  approvalStatus: z.preprocess(emptyToUndefined, approvalStatusField.optional()),
  status: z.preprocess(emptyToUndefined, expiryStatusField.optional()),
});

const addAmcContractSchema = z
  .object({
    contractName: z.string().trim().min(1),
    amcVendorId: positiveIntegerId,
    contractType: contractTypeField,
    startDate: contractDateField,
    endDate: contractDateField,
    contractValue: moneyField,
    paymentTerms: paymentTermsField,
    serviceVisitFrequency: serviceVisitFrequencyField,
    slaResponseHours: slaResponseHoursField,
    slaResolutionHours: slaResolutionHoursField,
    description: optionalTrimmedString,
  })
  .refine(dateRangeRefine, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

const updateAmcContractSchema = z
  .object({
    amcContractId: positiveIntegerId,
    contractName: z.string().trim().min(1).optional(),
    contractType: contractTypeField.optional(),
    startDate: contractDateField.optional(),
    endDate: contractDateField.optional(),
    contractValue: moneyField.optional(),
    paymentTerms: paymentTermsField.optional(),
    serviceVisitFrequency: serviceVisitFrequencyField.optional(),
    slaResponseHours: slaResponseHoursField.optional(),
    slaResolutionHours: slaResolutionHoursField.optional(),
    description: optionalTrimmedString,
  })
  .refine(
    (d) =>
      d.contractName !== undefined ||
      d.contractType !== undefined ||
      d.startDate !== undefined ||
      d.endDate !== undefined ||
      d.contractValue !== undefined ||
      d.paymentTerms !== undefined ||
      d.serviceVisitFrequency !== undefined ||
      d.slaResponseHours !== undefined ||
      d.slaResolutionHours !== undefined ||
      d.description !== undefined,
    { message: "At least one field is required to update" }
  )
  .refine(
    (d) => {
      if (d.startDate === undefined || d.endDate === undefined) {
        return true;
      }
      return dateRangeRefine(d);
    },
    {
      message: "endDate must be on or after startDate",
      path: ["endDate"],
    }
  );

router.post("/", userAuth, validate({ body: addAmcContractSchema }), addAmcContract);
router.post(
  "/submitforapproval",
  userAuth,
  validate({ body: amcContractIdBodySchema }),
  submitAmcContractForApproval
);
router.post(
  "/approve",
  userAuth,
  validate({ body: amcContractIdBodySchema }),
  approveAmcContract
);
router.get("/numberpreview", userAuth, previewAmcContractNumber);
router.get("/summary", userAuth, getAmcContractSummary);
router.get("/", userAuth, validate({ query: listQuerySchema }), getAllAmcContract);
router.get(
  "/single",
  userAuth,
  validate({ query: amcContractIdQuerySchema }),
  getSingleAmcContractDetails
);
router.patch("/", userAuth, validate({ body: updateAmcContractSchema }), updateAmcContract);
router.delete(
  "/",
  userAuth,
  validate({ query: amcContractIdQuerySchema }),
  deleteAmcContract
);

export default router;
