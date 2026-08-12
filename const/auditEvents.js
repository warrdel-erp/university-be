// Canonical business event type names (stored in event.event_type)
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

    // ─── Exam Setup Type ──────────────────────────────────────────────
    EXAM_SETUP_TYPE_CREATE:   "EXAM_SETUP_TYPE_CREATE",
    EXAM_SETUP_TYPE_UPDATE:   "EXAM_SETUP_TYPE_UPDATE",
    EXAM_SETUP_TYPE_DELETE:   "EXAM_SETUP_TYPE_DELETE",
});
