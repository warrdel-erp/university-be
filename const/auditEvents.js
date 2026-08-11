/**
 * AUDIT_EVENTS — Canonical business event type names.
 *
 * These are business-level identifiers, NOT database operation names.
 * Each value must match a string written into event.event_type.
 *
 * Naming convention: ENTITY_VERB (past-tense or gerund describing the business action)
 *
 * Do NOT use raw CRUD names (CREATE / UPDATE / DELETE) here.
 * Database actions are captured separately in AUDIT_ACTIONS (auditActions.js).
 *
 * To extend: add a new key/value pair following the existing pattern.
 */
export const AUDIT_EVENTS = Object.freeze({
    // ─── Student ──────────────────────────────────────────────────────
    STUDENT_CREATE:           "STUDENT_CREATE",
    STUDENT_UPDATE:           "STUDENT_UPDATE",
    STUDENT_PROMOTE:          "STUDENT_PROMOTE",

    // ─── Exam Schedule ────────────────────────────────────────────────
    EXAM_SCHEDULE_CREATE:     "EXAM_SCHEDULE_CREATE",
    EXAM_SCHEDULE_UPDATE:     "EXAM_SCHEDULE_UPDATE",
    EXAM_SCHEDULE_DELETE:     "EXAM_SCHEDULE_DELETE",

    // ─── Exam Room ────────────────────────────────────────────────────
    EXAM_ROOM_ALLOCATE:       "EXAM_ROOM_ALLOCATE",
    EXAM_ROOM_UNMAP:          "EXAM_ROOM_UNMAP",

    // ─── Exam Seat ────────────────────────────────────────────────────
    EXAM_SEAT_ALLOCATE:       "EXAM_SEAT_ALLOCATE",
    EXAM_SEAT_REALLOCATE:     "EXAM_SEAT_REALLOCATE",

    // ─── Hall Ticket ──────────────────────────────────────────────────
    HALL_TICKET_GENERATE:     "HALL_TICKET_GENERATE",
    HALL_TICKET_REGENERATE:   "HALL_TICKET_REGENERATE",
    HALL_TICKET_PUBLISH:      "HALL_TICKET_PUBLISH",
    HALL_TICKET_BLOCK:        "HALL_TICKET_BLOCK",

    // ─── Question Paper ───────────────────────────────────────────────
    QUESTION_PAPER_CREATE:    "QUESTION_PAPER_CREATE",
    QUESTION_PAPER_UPDATE:    "QUESTION_PAPER_UPDATE",
    QUESTION_PAPER_APPROVE:   "QUESTION_PAPER_APPROVE",
    QUESTION_PAPER_DELETE:    "QUESTION_PAPER_DELETE",

    // ─── Result ───────────────────────────────────────────────────────
    RESULT_GENERATE:          "RESULT_GENERATE",
    RESULT_PUBLISH:           "RESULT_PUBLISH",

    // ─── Hall Ticket (eligibility override) ───────────────────────────
    HALL_TICKET_MARK_ELIGIBLE: "HALL_TICKET_MARK_ELIGIBLE",
});
