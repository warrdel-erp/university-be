import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import * as controller from "../controllers/billingSchedulePaymentTermsController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const installmentSchema = z.coerce
  .number({ invalid_type_error: "installment must be a number" })
  .int({ message: "installment must be an integer" })
  .positive({ message: "installment must be positive" });

const singleTermInputSchema = z.object({
  billingScheduleItemId: positiveIntegerId,
  installment: installmentSchema,
});

const createPaymentTermSchema = z.union([
  z.array(singleTermInputSchema).min(1, "At least one payment term is required"),
  singleTermInputSchema,
]);

const listPaymentTermsQuerySchema = z.object({
  billingScheduleItemId: positiveIntegerId.optional(),
  installment: installmentSchema.optional(),
  page: positiveIntegerId.optional().default(1),
  limit: positiveIntegerId.optional().default(10),
});

const singlePaymentTermQuerySchema = z.object({
  billingSchedulePaymentTermsId: positiveIntegerId,
});

const updatePaymentTermSchema = z.object({
  billingSchedulePaymentTermsId: positiveIntegerId,
  billingScheduleItemId: positiveIntegerId.optional(),
  installment: installmentSchema.optional(),
});

const deletePaymentTermQuerySchema = z.object({
  billingSchedulePaymentTermsId: positiveIntegerId,
});

// CRUD Endpoints
router.post(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_ADD.value),
  validate({ body: createPaymentTermSchema }),
  controller.createPaymentTerm
);

router.get(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: listPaymentTermsQuerySchema }),
  controller.getPaymentTerms
);

router.get(
  "/single",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN.value),
  validate({ query: singlePaymentTermQuerySchema }),
  controller.getSinglePaymentTerm
);

router.patch(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value),
  validate({ body: updatePaymentTermSchema }),
  controller.updatePaymentTerm
);

router.delete(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value),
  validate({ query: deletePaymentTermQuerySchema }),
  controller.deletePaymentTerm
);

export default router;
