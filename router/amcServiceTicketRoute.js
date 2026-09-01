import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  serviceTicketIssueTypes,
  serviceTicketPriorities,
  serviceTicketStatuses,
} from "../constant.js";
import {
  addServiceTicket,
  addMyServiceTicket,
  getAllServiceTickets,
  getSingleServiceTicketDetails,
  getMySingleServiceTicketDetails,
  updateServiceTicket,
  deleteServiceTicket,
  previewServiceTicketNumber,
  getServiceTicketSummary,
  getMyServiceTickets,
  getMyServiceTicketSummary,
} from "../controllers/amcServiceTicketController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const emptyToUndefined = (value) => (value === "" || value === null ? undefined : value);

const issueTypeField = z.enum(serviceTicketIssueTypes, {
  errorMap: () => ({
    message: `issueType must be one of: ${serviceTicketIssueTypes.join(", ")}`,
  }),
});

const priorityField = z.enum(serviceTicketPriorities, {
  errorMap: () => ({
    message: `priority must be one of: ${serviceTicketPriorities.join(", ")}`,
  }),
});

const statusField = z.enum(serviceTicketStatuses, {
  errorMap: () => ({
    message: `status must be one of: ${serviceTicketStatuses.join(", ")}`,
  }),
});

const serviceTicketIdQuerySchema = z.object({
  serviceTicketId: positiveIntegerId,
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  status: z.preprocess(emptyToUndefined, statusField.optional()),
  priority: z.preprocess(emptyToUndefined, priorityField.optional()),
  amcVendorId: z.preprocess(emptyToUndefined, positiveIntegerId.optional()),
});

const addServiceTicketSchema = z.object({
  assetId: positiveIntegerId,
  amcVendorId: positiveIntegerId.optional().nullable(),
  issue: z.string().trim().min(1),
  issueType: issueTypeField,
  problemDescription: z.string().trim().min(1).max(1000),
  downtimeStartedAt: z.string().datetime({ offset: true }),
  priority: priorityField.optional(),
});

const updateServiceTicketSchema = z
  .object({
    serviceTicketId: positiveIntegerId,
    issue: z.string().trim().min(1).optional(),
    issueType: issueTypeField.optional(),
    problemDescription: z.string().trim().min(1).max(1000).optional(),
    downtimeStartedAt: z.string().datetime({ offset: true }).optional(),
    priority: priorityField.optional(),
    status: statusField.optional(),
    amcVendorId: positiveIntegerId.optional().nullable(),
  })
  .refine(
    (d) =>
      d.issue !== undefined ||
      d.issueType !== undefined ||
      d.problemDescription !== undefined ||
      d.downtimeStartedAt !== undefined ||
      d.priority !== undefined ||
      d.status !== undefined ||
      d.amcVendorId !== undefined,
    { message: "At least one field is required to update" }
  );

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/", userAuth, checkAccess(PERMISSIONS.SERVICE_TICKETS_ADD.value, 'amcServiceTicket'), validate({ body: addServiceTicketSchema }), addServiceTicket);
router.post("/my", userAuth, validate({ body: addServiceTicketSchema }), addMyServiceTicket);
router.get("/numberpreview", userAuth, checkAccess(PERMISSIONS.SERVICE_TICKETS_ADD.value, 'amcServiceTicket'), previewServiceTicketNumber);
router.get("/my/numberpreview", userAuth,  previewServiceTicketNumber);
router.get("/my/summary", userAuth, getMyServiceTicketSummary);
router.get(
  "/my/single",
  userAuth,
  validate({ query: serviceTicketIdQuerySchema }),
  getMySingleServiceTicketDetails
);
router.get("/my", userAuth, validate({ query: listQuerySchema }), getMyServiceTickets);

router.get("/summary", userAuth, checkAccess(PERMISSIONS.SERVICE_TICKETS.value, 'amcServiceTicket'), getServiceTicketSummary);
router.get("/", userAuth, checkAccess(PERMISSIONS.SERVICE_TICKETS.value, 'amcServiceTicket'), validate({ query: listQuerySchema }), getAllServiceTickets);
router.get(
  "/single",
  userAuth,
  checkAccess(PERMISSIONS.SERVICE_TICKETS.value, 'amcServiceTicket'),
  validate({ query: serviceTicketIdQuerySchema }),
  getSingleServiceTicketDetails
);
router.patch("/", userAuth, checkAccess(PERMISSIONS.SERVICE_TICKETS_EDIT.value, 'amcServiceTicket'), validate({ body: updateServiceTicketSchema }), updateServiceTicket);
router.delete(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.SERVICE_TICKETS_DELETE.value, 'amcServiceTicket'),
  validate({ query: serviceTicketIdQuerySchema }),
  deleteServiceTicket
);

export default router;
