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

const canGenerateQuerySchema = z.object({
    examSetupTypeTermId: z.string().regex(/^\d+$/, "examSetupTypeTermId must be a number"),
    sessionId: z.string().regex(/^\d+$/, "sessionId must be a number")
});

/** `termNumber` + `sessionId` — one summary row per scheduled exam cohort (`examSetupTypeTermId` + `sessionId`). */
const examTypeDashboardQuerySchema = z.object({
    sessionId: z.coerce.number().int().positive(),
    termNumber: z.coerce.number().int(),
});

const qrQuerySchema = z.object({
    qr: z.string().min(1, "qr is required")
});

/** Required `examSetupTypeTermId`; optional `sessionId` narrows to one cohort. */
const studentsByExamTermQuerySchema = z.object({
    examSetupTypeTermId: z.string().regex(/^\d+$/, "examSetupTypeTermId must be a number"),
    sessionId: z.string().regex(/^\d+$/, "sessionId must be a number").optional(),
});

router.post("/generate", userAuth, validate({ body: generateSchema }), studentHallTicketController.generateHallTickets);
router.get("/canGenerate", userAuth, validate({ query: canGenerateQuerySchema }), studentHallTicketController.canGenerateHallTickets);
router.get("/byQr", userAuth, validate({ query: qrQuerySchema }), studentHallTicketController.getHallTicketByQr);

router.get(
    "/exam-type/dashboard",
    userAuth,
    validate({ query: examTypeDashboardQuerySchema }),
    studentHallTicketController.getExamTypeDashboard
);

router.get(
    "/students/by-exam-term",
    userAuth,
    validate({ query: studentsByExamTermQuerySchema }),
    studentHallTicketController.getHallTicketStudentsByExamTerm
);

router.get("/", userAuth, studentHallTicketController.getAllHallTickets);
router.get("/:id", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.getHallTicketById);

export default router;
