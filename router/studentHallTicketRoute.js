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

const qrQuerySchema = z.object({
    qr: z.string().min(1, "qr is required")
});

const allExamsQuerySchema = z.object({
    studentId: z.string().regex(/^\d+$/).transform((v) => Number(v)).optional()
});

const updateSchema = z.object({
    qr: z.string().min(1).optional(),
    examSetupTypeTermId: z.number().optional(),
    sessionId: z.number().optional(),
    studentId: z.number().optional(),
    instituteId: z.number().optional(),
    universityId: z.number().optional()
}).refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field is required for update"
});

const statusByExamTypeQuerySchema = z.object({
    sessionId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
    /** Same as GET /examStructure/examType/single — maps to examSetupTypeTerm.term in schedule filters. */
    termNumber: z.coerce.number().int().optional(),
    term: z.coerce.number().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    semesterId: z.coerce.number().int().positive().optional(),
    examSetupTypeTermId: z.coerce.number().int().positive().optional(),
    examSetupTypeId: z.coerce.number().int().positive().optional(),
});

router.post("/generate", userAuth, validate({ body: generateSchema }), studentHallTicketController.generateHallTickets);
router.get("/canGenerate", userAuth, validate({ query: canGenerateQuerySchema }), studentHallTicketController.canGenerateHallTickets);
router.get("/byQr", userAuth, validate({ query: qrQuerySchema }), studentHallTicketController.getHallTicketByQr);
router.get(
    "/all",
    userAuth,
    validate({ query: allExamsQuerySchema }),
    studentHallTicketController.getAllHallTicketsAllExams
);

router.get(
    "/status/by-exam-type",
    userAuth,
    validate({ query: statusByExamTypeQuerySchema }),
    studentHallTicketController.getHallTicketStatusByExamType
);

router.get(
    "/exams-scheduled",
    userAuth,
    validate({ query: statusByExamTypeQuerySchema }),
    studentHallTicketController.getExamsScheduled
);

router.get("/", userAuth, studentHallTicketController.getAllHallTickets);
router.get("/:id", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.getHallTicketById);
router.patch("/:id", userAuth, validate({ params: idParamsSchema, body: updateSchema }), studentHallTicketController.updateHallTicket);

export default router;
