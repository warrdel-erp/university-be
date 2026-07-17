import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import * as studentHallTicketController from "../controllers/studentHallTicketController.js";

const router = Router();

const idParamsSchema = z.object({
    id: z.string().regex(/^\d+$/, "id must be a number").transform((v) => Number(v))
});

const generateSchema = z.object({
    examSetupTypeTermId: z.number({ required_error: "examSetupTypeTermId is required" }),
    sessionId: z.number({ required_error: "sessionId is required" })
});

const qrQuerySchema = z.object({
    qr: z.string().min(1, "qr is required")
});

/** Filters + optional `page` / `limit` (limit defaults 1000, clamped 10–1000 per page). */
const listHallTicketsQuerySchema = z.object({
    examSetupTypeTermId: z.coerce.number().int("examSetupTypeTermId must be an integer").positive("examSetupTypeTermId must be greater than 0").optional(),
    sessionId: z.coerce.number().int("sessionId must be an integer").positive("sessionId must be greater than 0").optional(),
    studentId: z.coerce.number().int("studentId must be an integer").positive("studentId must be greater than 0").optional(),
    page: z.coerce.number().int("page must be an integer").min(1, "page must be at least 1").optional().default(1),
    limit: z.coerce.number().int("limit must be an integer").min(1, "limit must be at least 1").optional().default(1000),
});

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/generate", userAuth, checkAccess(PERMISSIONS.HALL_TICKETS_ADD.value, null), validate({ body: generateSchema }), studentHallTicketController.generateHallTickets);

router.get("/byQr", userAuth, checkAccess(PERMISSIONS.HALL_TICKETS.value, null), validate({ query: qrQuerySchema }), studentHallTicketController.getHallTicketByQr);

router.get("/", userAuth, checkAccess(PERMISSIONS.HALL_TICKETS.value, null), validate({ query: listHallTicketsQuerySchema }), studentHallTicketController.getAllHallTickets);

router.get("/:id", userAuth, checkAccess(PERMISSIONS.HALL_TICKETS.value, null), validate({ params: idParamsSchema }), studentHallTicketController.getHallTicketById);

export default router;
