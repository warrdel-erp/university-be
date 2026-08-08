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
    examinationSessionId: z.number({ required_error: "examinationSessionId is required" })
});

const qrQuerySchema = z.object({
    qr: z.string().min(1, "qr is required")
});

/** Filters + optional `page` / `limit` (limit defaults 1000, clamped 10–1000 per page). */
const listHallTicketsQuerySchema = z.object({
    examinationSessionId: z.coerce.number().int("examinationSessionId must be an integer").positive("examinationSessionId must be greater than 0").optional(),
    studentId: z.coerce.number().int("studentId must be an integer").positive("studentId must be greater than 0").optional(),
    page: z.coerce.number().int("page must be an integer").min(1, "page must be at least 1").optional().default(1),
    limit: z.coerce.number().int("limit must be an integer").min(1, "limit must be at least 1").optional().default(1000),
});

const singleStudentGenerateSchema = z.object({
    examinationSessionId: z.number({ required_error: "examinationSessionId is required" }),
    studentId: z.number({ required_error: "studentId is required" }),
});

const publishSessionSchema = z.object({
    examinationSessionId: z.number({ required_error: "examinationSessionId is required" }),
});

const examinationSessionIdParamsSchema = z.object({
    examinationSessionId: z.string().regex(/^\d+$/, "examinationSessionId must be a number").transform((v) => Number(v))
});

const studentEligibilityParamsSchema = z.object({
    examinationSessionId: z.string().regex(/^\d+$/, "examinationSessionId must be a number").transform((v) => Number(v)),
    studentId: z.string().regex(/^\d+$/, "studentId must be a number").transform((v) => Number(v)),
});


const sessionStudentsQuerySchema = z.object({
    courseId: z.coerce.number().int("courseId must be an integer").positive("courseId must be positive").optional(),
    sessionId: z.coerce.number().int("sessionId must be an integer").positive("sessionId must be positive").optional(),
    term: z.coerce.number().int("term must be an integer").positive("term must be positive").optional(),
    status: z.enum(["Ready", "Blocked", "Review", "Not Generated", "Generated", "Published"]).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int("page must be an integer").min(1, "page must be at least 1").optional().default(1),
    limit: z.coerce.number().int("limit must be an integer").min(1, "limit must be at least 1").optional().default(10),
});


// 1. Cancel / block an already-generated hall ticket
router.patch("/block/:id", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.blockHallTicket);

// 2. Verify / fetch hall ticket through QR
router.get("/byQr", userAuth, validate({ query: qrQuerySchema }), studentHallTicketController.getHallTicketByQr);

// 3. Publish an individual student's hall ticket
router.patch("/:id/publish", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.publishStudentHallTicket);

// 4. Publish generated hall tickets for the examination session
router.post("/publishSession", userAuth, validate({ body: publishSessionSchema }), studentHallTicketController.publishSessionHallTickets);

// 5. Get complete hall ticket with student + exam schedule + room details
router.get("/:id", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.getHallTicketById);

// 6. Generate / regenerate hall ticket for one student
router.post("/generateStudent", userAuth, validate({ body: singleStudentGenerateSchema }), studentHallTicketController.generateOrRegenerateStudentTicket);

// 7. Bulk-generate hall tickets for all Ready students
router.post("/generate", userAuth, validate({ body: generateSchema }), studentHallTicketController.generateHallTickets);

// 8. Get one student's detailed eligibility before generating ticket
router.get("/eligibility/:examinationSessionId/:studentId", userAuth, validate({ params: studentEligibilityParamsSchema }), studentHallTicketController.getStudentEligibilityDetails);



// Additional List route
router.get("/", userAuth, validate({ query: listHallTicketsQuerySchema }), studentHallTicketController.getAllHallTickets);

router.get("/sessionStudents/:examinationSessionId", userAuth, validate({ params: examinationSessionIdParamsSchema, query: sessionStudentsQuerySchema }), studentHallTicketController.getStudentsForExaminationSession);

export default router;
