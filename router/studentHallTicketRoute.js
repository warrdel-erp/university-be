import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
// import { checkAccess } from "../middleware/checkAccess.js";
// import { PERMISSIONS } from "../const/permissions.js";
import * as studentHallTicketController from "../controllers/studentHallTicketController.js";

const router = Router();

const idParamsSchema = z.object({
    id: z.string().regex(/^\d+$/, "id must be a number").transform((v) => Number(v))
});

const generateSchema = z.object({
    examinationSessionId: z.number({ required_error: "examinationSessionId is required" }),
    studentIds: z.array(z.number()).optional(),
    overrideReason: z.string().optional(),
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



const publishHallTicketsSchema = z.object({
    examinationSessionId: z.number({ required_error: "examinationSessionId is required" }),
    studentIds: z.array(z.number()).optional(),
});

const examinationSessionIdParamsSchema = z.object({
    examinationSessionId: z.string().regex(/^\d+$/, "examinationSessionId must be a number").transform((v) => Number(v))
});

const studentEligibilityParamsSchema = z.object({
    examinationSessionId: z.string().regex(/^\d+$/, "examinationSessionId must be a number").transform((v) => Number(v)),
    studentId: z.string().regex(/^\d+$/, "studentId must be a number").transform((v) => Number(v)),
});


const queryArrayOrSingleNumberSchema = z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (Array.isArray(val)) return val.map(Number);
    if (typeof val === "string") {
        if (val.includes(",")) {
            return val.split(",").map(Number);
        }
        return [Number(val)];
    }
    return [Number(val)];
}, z.array(z.number()).optional());

const sessionStudentsQuerySchema = z.object({
    courseId: queryArrayOrSingleNumberSchema,
    sessionId: queryArrayOrSingleNumberSchema,
    term: queryArrayOrSingleNumberSchema,
    status: z.preprocess(
        (val) => (val === "" || val === null || val === undefined ? undefined : val),
        z.enum(["Ready", "Blocked", "Review", "Not Generated", "Generated", "Published"]).optional()
    ),
    search: z.preprocess(
        (val) => (val === "" || val === null ? undefined : val),
        z.string().optional()
    ),
    page: z.coerce.number().int("page must be an integer").min(1, "page must be at least 1").optional().default(1),
    limit: z.coerce.number().int("limit must be an integer").min(1, "limit must be at least 1").optional().default(10),
});


const reviewDetailsParamsSchema = z.object({
    studentId: z.string().regex(/^\d+$/, "studentId must be a number").transform((v) => Number(v)),
});

const reviewDetailsQuerySchema = z.object({
    examinationSessionId: z.coerce.number().int("examinationSessionId must be an integer").positive("examinationSessionId must be greater than 0"),
});

// 1. Cancel / block an already-generated hall ticket
router.patch("/block/:id", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.blockHallTicket);

// 2. Verify / fetch hall ticket through QR
router.get("/byQr", userAuth, validate({ query: qrQuerySchema }), studentHallTicketController.getHallTicketByQr);

// 3. Publish hall tickets (all or specific student IDs) for the examination session
router.post("/publish", userAuth, validate({ body: publishHallTicketsSchema }), studentHallTicketController.publishHallTickets);

// 5. Generate / regenerate hall tickets (all eligible or specific student IDs)
router.post("/generate", userAuth, validate({ body: generateSchema }), studentHallTicketController.generateHallTickets);

// 7. Get one student's detailed eligibility before generating ticket
router.get("/eligibility/:examinationSessionId/:studentId", userAuth, validate({ params: studentEligibilityParamsSchema }), studentHallTicketController.getStudentEligibilityDetails);

// 8. Get hall ticket eligibility overview counts for summary cards
router.get("/eligibilityOverview/:examinationSessionId", userAuth, validate({ params: examinationSessionIdParamsSchema }), studentHallTicketController.getHallTicketEligibilityOverview);

// 9. Get session students for examination session
router.get("/sessionStudents/:examinationSessionId", userAuth, validate({ params: examinationSessionIdParamsSchema, query: sessionStudentsQuerySchema }), studentHallTicketController.getStudentsForExaminationSession);

// 9b. Get review details for a student
router.get("/reviewDetails/:studentId", userAuth, validate({ params: reviewDetailsParamsSchema, query: reviewDetailsQuerySchema }), studentHallTicketController.getReviewDetails);

// 10. Additional List route
router.get("/", userAuth, validate({ query: listHallTicketsQuerySchema }), studentHallTicketController.getAllHallTickets);

// 11. Get complete hall ticket with student + exam schedule + room details (Wildcard /:id route must come after specific routes)
router.get("/:id", userAuth, validate({ params: idParamsSchema }), studentHallTicketController.getHallTicketById);

export default router;
