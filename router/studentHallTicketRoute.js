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
    examSetupTypeTermId: z.string().regex(/^\d+$/, "examSetupTypeTermId must be a number").optional(),
    sessionId: z.string().regex(/^\d+$/, "sessionId must be a number").optional(),
    studentId: z.string().regex(/^\d+$/, "studentId must be a number").optional(),
    page: z.string().regex(/^\d+$/, "page must be a positive integer").optional(),
    limit: z.string().regex(/^\d+$/, "limit must be a positive integer").optional(),
});

router.post("/generate", userAuth, validate({ body: generateSchema }), studentHallTicketController.generateHallTickets);
router.get("/byQr", userAuth, validate({ query: qrQuerySchema }), studentHallTicketController.getHallTicketByQr);

router.get("/", userAuth, validate({ query: listHallTicketsQuerySchema }), studentHallTicketController.getAllHallTickets);

router.get("/:id", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.getHallTicketById);

export default router;
