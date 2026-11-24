// Canonical business event type names (stored in event.event_type)
export const AUDIT_EVENTS = Object.freeze({
    // ─── Campus ────────────────────────────────────────────────────────
    CAMPUS_CREATE:            "CAMPUS_CREATE",
    CAMPUS_UPDATE:            "CAMPUS_UPDATE",
    CAMPUS_DELETE:            "CAMPUS_DELETE",

    // ─── Institute ──────────────────────────────────────────────────────
    INSTITUTE_CREATE:         "INSTITUTE_CREATE",
    INSTITUTE_UPDATE:         "INSTITUTE_UPDATE",
    INSTITUTE_DELETE:         "INSTITUTE_DELETE",
    AFFILIATED_UNIVERSITY_UPDATE: "AFFILIATED_UNIVERSITY_UPDATE",

    // ─── Course ────────────────────────────────────────────────────────
    COURSE_CREATE:            "COURSE_CREATE",
    COURSE_UPDATE:            "COURSE_UPDATE",
    COURSE_DELETE:            "COURSE_DELETE",
    COURSE_STATUS_CHANGE:     "COURSE_STATUS_CHANGE",

    // ─── Code Master ───────────────────────────────────────────────────
    CODE_MASTER_CREATE:       "CODE_MASTER_CREATE",
    CODE_MASTER_UPDATE:       "CODE_MASTER_UPDATE",
    CODE_MASTER_DELETE:       "CODE_MASTER_DELETE",

    // ─── Department ─────────────────────────────────────────────────────
    DEPARTMENT_CREATE:        "DEPARTMENT_CREATE",
    DEPARTMENT_UPDATE:        "DEPARTMENT_UPDATE",
    DEPARTMENT_DELETE:        "DEPARTMENT_DELETE",

    // ─── Department Positions ───────────────────────────────────────────
    DEPARTMENT_POSITION_CREATE: "DEPARTMENT_POSITION_CREATE",
    DEPARTMENT_POSITION_UPDATE: "DEPARTMENT_POSITION_UPDATE",
    DEPARTMENT_POSITION_DELETE: "DEPARTMENT_POSITION_DELETE",
    USER_DEPARTMENT_POSITION_CREATE: "USER_DEPARTMENT_POSITION_CREATE",
    USER_DEPARTMENT_POSITION_UPDATE: "USER_DEPARTMENT_POSITION_UPDATE",
    USER_DEPARTMENT_POSITION_DELETE: "USER_DEPARTMENT_POSITION_DELETE",

    // ─── Governance Body ────────────────────────────────────────────────
    GOVERNANCE_BODY_CREATE:   "GOVERNANCE_BODY_CREATE",
    GOVERNANCE_BODY_UPDATE:   "GOVERNANCE_BODY_UPDATE",
    GOVERNANCE_BODY_DELETE:   "GOVERNANCE_BODY_DELETE",

    // ─── Curriculum ─────────────────────────────────────────────────────
    CURRICULUM_CREATE:                 "CURRICULUM_CREATE",
    CURRICULUM_UPDATE:                 "CURRICULUM_UPDATE",
    CURRICULUM_DELETE:                 "CURRICULUM_DELETE",
    CURRICULUM_PUBLISH_STATUS_CHANGE:  "CURRICULUM_PUBLISH_STATUS_CHANGE",
    CURRICULUM_SUBJECT_MAP:            "CURRICULUM_SUBJECT_MAP",
    CURRICULUM_SUBJECT_MAPPING_UPDATE: "CURRICULUM_SUBJECT_MAPPING_UPDATE",
    CURRICULUM_SUBJECT_UNMAP:          "CURRICULUM_SUBJECT_UNMAP",
    CURRICULUM_BATCH_MAP:              "CURRICULUM_BATCH_MAP",
    CURRICULUM_BATCH_UNMAP:            "CURRICULUM_BATCH_UNMAP",

    // ─── Curriculum Category ────────────────────────────────────────────
    CURRICULUM_CATEGORY_CREATE:        "CURRICULUM_CATEGORY_CREATE",
    CURRICULUM_CATEGORY_UPDATE:        "CURRICULUM_CATEGORY_UPDATE",
    CURRICULUM_CATEGORY_DELETE:        "CURRICULUM_CATEGORY_DELETE",

    // ─── Subject Component ──────────────────────────────────────────────
    SUBJECT_COMPONENT_CREATE:          "SUBJECT_COMPONENT_CREATE",
    SUBJECT_COMPONENT_UPDATE:          "SUBJECT_COMPONENT_UPDATE",
    SUBJECT_COMPONENT_DELETE:          "SUBJECT_COMPONENT_DELETE",

    // ─── Elective Pool ──────────────────────────────────────────────────
    ELECTIVE_POOL_CREATE:              "ELECTIVE_POOL_CREATE",
    ELECTIVE_POOL_UPDATE:              "ELECTIVE_POOL_UPDATE",
    ELECTIVE_POOL_DELETE:              "ELECTIVE_POOL_DELETE",
    ELECTIVE_POOL_SUBJECT_MAP:         "ELECTIVE_POOL_SUBJECT_MAP",
    ELECTIVE_POOL_SUBJECT_UNMAP:       "ELECTIVE_POOL_SUBJECT_UNMAP",

    // ─── Subject ────────────────────────────────────────────────────────
    SUBJECT_CREATE:                    "SUBJECT_CREATE",
    SUBJECT_UPDATE:                    "SUBJECT_UPDATE",
    SUBJECT_DELETE:                    "SUBJECT_DELETE",
    SUBJECT_TERM_ASSIGN:               "SUBJECT_TERM_ASSIGN",

    // ─── Class Section ──────────────────────────────────────────────────
    CLASS_SECTION_CREATE:              "CLASS_SECTION_CREATE",
    CLASS_SECTION_UPDATE:              "CLASS_SECTION_UPDATE",
    CLASS_SECTION_DELETE:              "CLASS_SECTION_DELETE",

    // ─── Academic Group Scope ───────────────────────────────────────────
    ACADEMIC_GROUP_SCOPE_CREATE:       "ACADEMIC_GROUP_SCOPE_CREATE",
    ACADEMIC_GROUP_SCOPE_UPDATE:       "ACADEMIC_GROUP_SCOPE_UPDATE",
    ACADEMIC_GROUP_SCOPE_DELETE:       "ACADEMIC_GROUP_SCOPE_DELETE",
    ACADEMIC_GROUP_SCOPE_PUBLISH:      "ACADEMIC_GROUP_SCOPE_PUBLISH",

    // ─── Academic Group ─────────────────────────────────────────────────
    ACADEMIC_GROUP_CREATE:             "ACADEMIC_GROUP_CREATE",
    ACADEMIC_GROUP_UPDATE:             "ACADEMIC_GROUP_UPDATE",
    ACADEMIC_GROUP_DELETE:             "ACADEMIC_GROUP_DELETE",
    ACADEMIC_GROUP_USER_ASSIGN:        "ACADEMIC_GROUP_USER_ASSIGN",
    ACADEMIC_GROUP_USER_UPDATE:        "ACADEMIC_GROUP_USER_UPDATE",
    ACADEMIC_GROUP_USER_REMOVE:        "ACADEMIC_GROUP_USER_REMOVE",
    ACADEMIC_GROUP_STUDENT_ASSIGN:     "ACADEMIC_GROUP_STUDENT_ASSIGN",
    ACADEMIC_GROUP_STUDENT_REMOVE:     "ACADEMIC_GROUP_STUDENT_REMOVE",

    // ─── Teacher Mapping ────────────────────────────────────────────────
    TEACHER_SUBJECT_MAP:               "TEACHER_SUBJECT_MAP",
    TEACHER_SUBJECT_UPDATE:            "TEACHER_SUBJECT_UPDATE",
    TEACHER_SUBJECT_UNMAP:             "TEACHER_SUBJECT_UNMAP",
    TEACHER_SECTION_MAP:               "TEACHER_SECTION_MAP",
    TEACHER_SECTION_UPDATE:            "TEACHER_SECTION_UPDATE",
    TEACHER_SECTION_UNMAP:             "TEACHER_SECTION_UNMAP",

    // ─── Timetable Routine / Cell ───────────────────────────────────────
    TIMETABLE_ROUTINE_CREATE:          "TIMETABLE_ROUTINE_CREATE",
    TIMETABLE_ROUTINE_UPDATE:          "TIMETABLE_ROUTINE_UPDATE",
    TIMETABLE_ROUTINE_DELETE:          "TIMETABLE_ROUTINE_DELETE",
    TIMETABLE_ROUTINE_CLONE:           "TIMETABLE_ROUTINE_CLONE",
    TIMETABLE_ROUTINE_PUBLISH:         "TIMETABLE_ROUTINE_PUBLISH",
    TIMETABLE_CELL_CREATE:             "TIMETABLE_CELL_CREATE",
    TIMETABLE_CELL_UPDATE:             "TIMETABLE_CELL_UPDATE",
    TIMETABLE_CELL_DELETE:             "TIMETABLE_CELL_DELETE",
    TIMETABLE_DATEWISE_CELL_UPDATE:    "TIMETABLE_DATEWISE_CELL_UPDATE",
    TIMETABLE_FILL_MISSING_SUBJECTS:   "TIMETABLE_FILL_MISSING_SUBJECTS",
    TIMETABLE_TEACHER_DELETE:          "TIMETABLE_TEACHER_DELETE",

    // ─── Timetable Academic Group Mapping ───────────────────────────────
    TIMETABLE_STRUCTURE_MAPPING_CREATE: "TIMETABLE_STRUCTURE_MAPPING_CREATE",
    TIMETABLE_STRUCTURE_MAPPING_DELETE: "TIMETABLE_STRUCTURE_MAPPING_DELETE",
    TIMETABLE_ACADEMIC_GROUP_ROUTINE_CREATE: "TIMETABLE_ACADEMIC_GROUP_ROUTINE_CREATE",

    // ─── Attendance ─────────────────────────────────────────────────────
    ATTENDANCE_MARK:                   "ATTENDANCE_MARK",
    ATTENDANCE_UPDATE:                 "ATTENDANCE_UPDATE",
    ATTENDANCE_COPY_PERIOD:            "ATTENDANCE_COPY_PERIOD",
    ATTENDANCE_IMPORT:                 "ATTENDANCE_IMPORT",

    // ─── Holiday ────────────────────────────────────────────────────────
    HOLIDAY_CREATE:                    "HOLIDAY_CREATE",
    HOLIDAY_UPDATE:                    "HOLIDAY_UPDATE",
    HOLIDAY_DELETE:                    "HOLIDAY_DELETE",

    // ─── Schedule ───────────────────────────────────────────────────────
    SCHEDULE_CREATE:                   "SCHEDULE_CREATE",
    SCHEDULE_UPDATE:                   "SCHEDULE_UPDATE",
    SCHEDULE_DELETE:                   "SCHEDULE_DELETE",
    SCHEDULE_TEACHER_ASSIGN:           "SCHEDULE_TEACHER_ASSIGN",
    SCHEDULE_ATTENDANCE_MARK:          "SCHEDULE_ATTENDANCE_MARK",
    SCHEDULE_ATTENDANCE_UPDATE:        "SCHEDULE_ATTENDANCE_UPDATE",

    // ─── Lecture Window ─────────────────────────────────────────────────
    LECTURE_WINDOW_CREATE:             "LECTURE_WINDOW_CREATE",
    LECTURE_WINDOW_UPDATE:             "LECTURE_WINDOW_UPDATE",
    LECTURE_WINDOW_DELETE:             "LECTURE_WINDOW_DELETE",

    // ─── Lesson Plan, Topic & Mapping ───────────────────────────────────
    LESSON_CREATE:                     "LESSON_CREATE",
    LESSON_UPDATE:                     "LESSON_UPDATE",
    LESSON_DELETE:                     "LESSON_DELETE",
    TOPIC_CREATE:                      "TOPIC_CREATE",
    TOPIC_UPDATE:                      "TOPIC_UPDATE",
    TOPIC_DELETE:                      "TOPIC_DELETE",
    LESSON_MAPPING_CREATE:             "LESSON_MAPPING_CREATE",
    LESSON_MAPPING_UPDATE:             "LESSON_MAPPING_UPDATE",
    LESSON_MAPPING_DELETE:             "LESSON_MAPPING_DELETE",
    LESSON_MAPPING_COPY:               "LESSON_MAPPING_COPY",
    LESSON_WINDOW_LINK:                "LESSON_WINDOW_LINK",

    // ─── Fee Type Catalog ───────────────────────────────────────────────
    FEE_TYPE_CATALOG_CREATE:           "FEE_TYPE_CATALOG_CREATE",
    FEE_TYPE_CATALOG_UPDATE:           "FEE_TYPE_CATALOG_UPDATE",
    FEE_TYPE_CATALOG_DELETE:           "FEE_TYPE_CATALOG_DELETE",

    // ─── Fee Type Category ──────────────────────────────────────────────
    FEE_TYPE_CATEGORY_CREATE:          "FEE_TYPE_CATEGORY_CREATE",
    FEE_TYPE_CATEGORY_UPDATE:          "FEE_TYPE_CATEGORY_UPDATE",
    FEE_TYPE_CATEGORY_DELETE:          "FEE_TYPE_CATEGORY_DELETE",

    // ─── Fee Policy ─────────────────────────────────────────────────────
    FEE_POLICY_CREATE:                 "FEE_POLICY_CREATE",
    FEE_POLICY_UPDATE:                 "FEE_POLICY_UPDATE",
    FEE_POLICY_PUBLISH:                "FEE_POLICY_PUBLISH",
    FEE_POLICY_UNPUBLISH:              "FEE_POLICY_UNPUBLISH",
    FEE_POLICY_DELETE:                 "FEE_POLICY_DELETE",
    FEE_POLICY_STUDENT_MAP:            "FEE_POLICY_STUDENT_MAP",
    FEE_POLICY_STUDENT_UNMAP:          "FEE_POLICY_STUDENT_UNMAP",

    // ─── Fee Plan Item & Billing ────────────────────────────────────────
    FEE_PLAN_ITEM_CREATE:              "FEE_PLAN_ITEM_CREATE",
    FEE_PLAN_ITEM_UPDATE:              "FEE_PLAN_ITEM_UPDATE",
    FEE_PLAN_ITEM_DELETE:              "FEE_PLAN_ITEM_DELETE",
    FEE_PLAN_SUB_ITEM_CREATE:          "FEE_PLAN_SUB_ITEM_CREATE",
    FEE_PLAN_SUB_ITEM_DELETE:          "FEE_PLAN_SUB_ITEM_DELETE",
    FEE_PLAN_PUBLISH:                  "FEE_PLAN_PUBLISH",
    FEE_PLAN_UNPUBLISH:                "FEE_PLAN_UNPUBLISH",

    // ─── Billing Schedule ───────────────────────────────────────────────
    BILLING_SCHEDULE_CREATE:              "BILLING_SCHEDULE_CREATE",
    BILLING_SCHEDULE_UPDATE:              "BILLING_SCHEDULE_UPDATE",
    BILLING_SCHEDULE_STATUS_UPDATE:       "BILLING_SCHEDULE_STATUS_UPDATE",
    BILLING_SCHEDULE_DELETE:              "BILLING_SCHEDULE_DELETE",
    BILLING_SCHEDULE_SUB_ITEM_CREATE:     "BILLING_SCHEDULE_SUB_ITEM_CREATE",
    BILLING_SCHEDULE_SUB_ITEM_DELETE:     "BILLING_SCHEDULE_SUB_ITEM_DELETE",
    BILLING_SCHEDULE_PAYMENT_TERM_CREATE: "BILLING_SCHEDULE_PAYMENT_TERM_CREATE",
    BILLING_SCHEDULE_PAYMENT_TERM_DELETE: "BILLING_SCHEDULE_PAYMENT_TERM_DELETE",

    // ─── Billing Schedule Payment Terms ─────────────────────────────────
    PAYMENT_TERM_CREATE:                  "PAYMENT_TERM_CREATE",
    PAYMENT_TERM_UPDATE:                  "PAYMENT_TERM_UPDATE",
    PAYMENT_TERM_DELETE:                  "PAYMENT_TERM_DELETE",

    // ─── Student Fee Invoice ────────────────────────────────────────────
    STUDENT_FEE_INVOICE_GENERATE:         "STUDENT_FEE_INVOICE_GENERATE",
    STUDENT_FEE_INVOICE_ADHOC_GENERATE:   "STUDENT_FEE_INVOICE_ADHOC_GENERATE",

    // ─── Student Fee Payment ────────────────────────────────────────────
    STUDENT_FEE_PAYMENT_RECORD:           "STUDENT_FEE_PAYMENT_RECORD",

    // ─── Student ──────────────────────────────────────────────────────
    STUDENT_CREATE:           "STUDENT_CREATE",
    STUDENT_UPDATE:           "STUDENT_UPDATE",
    STUDENT_DELETE:           "STUDENT_DELETE",
    STUDENT_IMPORT:           "STUDENT_IMPORT",
    STUDENT_PROMOTE:          "STUDENT_PROMOTE",
    STUDENT_COURSE_MAP:       "STUDENT_COURSE_MAP",
    STUDENT_SECTION_MAP:      "STUDENT_SECTION_MAP",
    STUDENT_ELECTIVE_MAP:     "STUDENT_ELECTIVE_MAP",

    // ─── Exam Schedule ────────────────────────────────────────────────
    EXAM_SCHEDULE_CREATE:     "EXAM_SCHEDULE_CREATE",
    EXAM_SCHEDULE_UPDATE:     "EXAM_SCHEDULE_UPDATE",
    EXAM_SCHEDULE_DELETE:     "EXAM_SCHEDULE_DELETE",

    // ─── Examination Session ──────────────────────────────────────────
    EXAMINATION_SESSION_PUBLISH: "EXAMINATION_SESSION_PUBLISH",

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

    // ─── Result ───────────────────────────────────────────────────────
    RESULT_GENERATE:          "RESULT_GENERATE",
    RESULT_PUBLISH:           "RESULT_PUBLISH",

    // ─── Hall Ticket (eligibility override) ───────────────────────────
    HALL_TICKET_MARK_ELIGIBLE: "HALL_TICKET_MARK_ELIGIBLE",

    // ─── Exam Setup Type ──────────────────────────────────────────────
    EXAM_SETUP_TYPE_CREATE:   "EXAM_SETUP_TYPE_CREATE",
    EXAM_SETUP_TYPE_UPDATE:   "EXAM_SETUP_TYPE_UPDATE",
    EXAM_SETUP_TYPE_DELETE:   "EXAM_SETUP_TYPE_DELETE",

    // ─── Grading Schema ────────────────────────────────────────────────
    GRADING_SCHEMA_CREATE:             "GRADING_SCHEMA_CREATE",
    GRADING_SCHEMA_UPDATE:             "GRADING_SCHEMA_UPDATE",
    GRADING_SCHEMA_DELETE:             "GRADING_SCHEMA_DELETE",
    GRADING_SCHEMA_GRADE_CREATE:       "GRADING_SCHEMA_GRADE_CREATE",
    GRADING_SCHEMA_GRADE_UPDATE:       "GRADING_SCHEMA_GRADE_UPDATE",
    GRADING_SCHEMA_GRADE_DELETE:       "GRADING_SCHEMA_GRADE_DELETE",
    GRADING_SCHEMA_PUBLISH:            "GRADING_SCHEMA_PUBLISH",
    GRADING_SCHEMA_DRAFT:              "GRADING_SCHEMA_DRAFT",

    // ─── Academic Regulation ───────────────────────────────────────────
    ACADEMIC_REGULATION_CREATE:        "ACADEMIC_REGULATION_CREATE",
    ACADEMIC_REGULATION_UPDATE:        "ACADEMIC_REGULATION_UPDATE",
    ACADEMIC_REGULATION_DELETE:        "ACADEMIC_REGULATION_DELETE",
    ACADEMIC_REGULATION_COURSE_MAP:    "ACADEMIC_REGULATION_COURSE_MAP",
    ACADEMIC_REGULATION_COURSE_UNMAP:  "ACADEMIC_REGULATION_COURSE_UNMAP",

    // ─── Assessment Plan ───────────────────────────────────────────────
    ASSESSMENT_PLAN_CREATE:            "ASSESSMENT_PLAN_CREATE",
    ASSESSMENT_PLAN_UPDATE:            "ASSESSMENT_PLAN_UPDATE",
    ASSESSMENT_PLAN_DELETE:            "ASSESSMENT_PLAN_DELETE",
    ASSESSMENT_PLAN_COMPONENT_CREATE:  "ASSESSMENT_PLAN_COMPONENT_CREATE",
    ASSESSMENT_PLAN_COMPONENT_UPDATE:  "ASSESSMENT_PLAN_COMPONENT_UPDATE",
    ASSESSMENT_PLAN_COMPONENT_DELETE:  "ASSESSMENT_PLAN_COMPONENT_DELETE",
    ASSESSMENT_PLAN_SUBJECT_MAP:       "ASSESSMENT_PLAN_SUBJECT_MAP",
    ASSESSMENT_PLAN_SUBJECT_UNMAP:     "ASSESSMENT_PLAN_SUBJECT_UNMAP",
    ASSESSMENT_PLAN_BATCH_PUBLISH:     "ASSESSMENT_PLAN_BATCH_PUBLISH",
    ASSESSMENT_PLAN_BATCH_UNFREEZE:    "ASSESSMENT_PLAN_BATCH_UNFREEZE",

    // ─── Internal Assessment ───────────────────────────────────────────
    INTERNAL_ASSESSMENT_CREATE:                  "INTERNAL_ASSESSMENT_CREATE",
    INTERNAL_ASSESSMENT_UPDATE:                  "INTERNAL_ASSESSMENT_UPDATE",
    INTERNAL_ASSESSMENT_EVALUATION_UPSERT:       "INTERNAL_ASSESSMENT_EVALUATION_UPSERT",
    INTERNAL_ASSESSMENT_FINAL_RESULT_CALCULATE:  "INTERNAL_ASSESSMENT_FINAL_RESULT_CALCULATE",
    INTERNAL_ASSESSMENT_FINAL_RESULT_SUBMIT:     "INTERNAL_ASSESSMENT_FINAL_RESULT_SUBMIT",

    // ─── Examination Session ───────────────────────────────────────────
    EXAMINATION_SESSION_CREATE:                  "EXAMINATION_SESSION_CREATE",
    EXAMINATION_SESSION_UPDATE:                  "EXAMINATION_SESSION_UPDATE",
    EXAMINATION_SESSION_DELETE:                  "EXAMINATION_SESSION_DELETE",
    EXAMINATION_SESSION_TERM_CREATE:             "EXAMINATION_SESSION_TERM_CREATE",
    EXAMINATION_SESSION_TERM_DELETE:             "EXAMINATION_SESSION_TERM_DELETE",
    EXAMINATION_SESSION_MARKS_SAVE:              "EXAMINATION_SESSION_MARKS_SAVE",
    EXAMINATION_SESSION_MARKS_STATUS_UPDATE:     "EXAMINATION_SESSION_MARKS_STATUS_UPDATE",

    // ─── Examination Session Slot ──────────────────────────────────────
    EXAMINATION_SESSION_SLOT_CREATE:             "EXAMINATION_SESSION_SLOT_CREATE",
    EXAMINATION_SESSION_SLOT_UPDATE:             "EXAMINATION_SESSION_SLOT_UPDATE",
    EXAMINATION_SESSION_SLOT_DELETE:             "EXAMINATION_SESSION_SLOT_DELETE",

    // ─── Evaluation ────────────────────────────────────────────────────
    EVALUATION_CREATE:                           "EVALUATION_CREATE",
    EVALUATION_UPDATE:                           "EVALUATION_UPDATE",
    EVALUATION_DELETE:                           "EVALUATION_DELETE",

    // ─── Exam Invigilator Assignment ───────────────────────────────────
    EXAM_INVIGILATOR_ASSIGNMENT_CREATE:          "EXAM_INVIGILATOR_ASSIGNMENT_CREATE",
    EXAM_INVIGILATOR_ASSIGNMENT_UPDATE:          "EXAM_INVIGILATOR_ASSIGNMENT_UPDATE",
    EXAM_INVIGILATOR_ASSIGNMENT_DELETE:          "EXAM_INVIGILATOR_ASSIGNMENT_DELETE",

    // ─── Exam Result ───────────────────────────────────────────────────
    EXAM_RESULT_CREATE:                          "EXAM_RESULT_CREATE",
    EXAM_RESULT_PUBLISH:                         "EXAM_RESULT_PUBLISH",
    EXAM_RESULT_ZSCORE_RESET:                    "EXAM_RESULT_ZSCORE_RESET",

    // ─── Exam Room Material Bundle ─────────────────────────────────────
    EXAM_ROOM_MATERIAL_BUNDLE_CREATE:            "EXAM_ROOM_MATERIAL_BUNDLE_CREATE",
    EXAM_ROOM_MATERIAL_BUNDLE_UPDATE:            "EXAM_ROOM_MATERIAL_BUNDLE_UPDATE",
    EXAM_ROOM_MATERIAL_BUNDLE_STATUS_UPDATE:     "EXAM_ROOM_MATERIAL_BUNDLE_STATUS_UPDATE",

    // ─── Exam Schedule & Room Capacity ─────────────────────────────────
    EXAM_ROOM_CAPACITY_CREATE:                   "EXAM_ROOM_CAPACITY_CREATE",
    EXAM_ROOM_CAPACITY_UPDATE:                   "EXAM_ROOM_CAPACITY_UPDATE",
    EXAM_ROOM_CAPACITY_DELETE:                   "EXAM_ROOM_CAPACITY_DELETE",
    EXAM_SEAT_ALLOCATE:                          "EXAM_SEAT_ALLOCATE",
    EXAM_SCHEDULE_PUBLISH:                       "EXAM_SCHEDULE_PUBLISH",

    // ─── Class Room (Room / Section) ────────────────────────────────────
    CLASS_ROOM_CREATE:                           "CLASS_ROOM_CREATE",
    CLASS_ROOM_UPDATE:                           "CLASS_ROOM_UPDATE",
    CLASS_ROOM_DELETE:                           "CLASS_ROOM_DELETE",

    // ─── Answer Sheet QR ────────────────────────────────────────────────
    ANSWER_SHEET_QR_BULK_CREATE:                 "ANSWER_SHEET_QR_BULK_CREATE",
    ANSWER_SHEET_QR_MAP:                         "ANSWER_SHEET_QR_MAP",
    ANSWER_SHEET_QR_ASSIGN_TEACHERS:             "ANSWER_SHEET_QR_ASSIGN_TEACHERS",
    ANSWER_SHEET_QR_MARKS_ASSIGN:                "ANSWER_SHEET_QR_MARKS_ASSIGN",
    ANSWER_SHEET_QR_MARKS_FINAL_SUBMIT:          "ANSWER_SHEET_QR_MARKS_FINAL_SUBMIT",
    ANSWER_SHEET_ANNOTATION_SAVE:                "ANSWER_SHEET_ANNOTATION_SAVE",

    // ─── Question Paper ─────────────────────────────────────────────────
    QUESTION_PAPER_CREATE:                       "QUESTION_PAPER_CREATE",
    QUESTION_PAPER_UPDATE:                       "QUESTION_PAPER_UPDATE",
    QUESTION_PAPER_DELETE:                       "QUESTION_PAPER_DELETE",
    QUESTION_PAPER_GENERATE:                     "QUESTION_PAPER_GENERATE",
    QUESTION_PAPER_APPROVE:                      "QUESTION_PAPER_APPROVE",
    QUESTION_PAPER_FINAL_APPROVE:                "QUESTION_PAPER_FINAL_APPROVE",

    // ─── Question Bank ──────────────────────────────────────────────────
    QUESTION_BANK_CREATE:                        "QUESTION_BANK_CREATE",
    QUESTION_BANK_UPDATE:                        "QUESTION_BANK_UPDATE",
    QUESTION_BANK_DELETE:                        "QUESTION_BANK_DELETE",
    QUESTION_BANK_BULK_APPROVE:                  "QUESTION_BANK_BULK_APPROVE",
    QUESTION_BANK_BULK_REJECT:                   "QUESTION_BANK_BULK_REJECT",

    // ─── Question Paper Blueprint ───────────────────────────────────────
    QUESTION_PAPER_BLUEPRINT_CREATE:             "QUESTION_PAPER_BLUEPRINT_CREATE",
    QUESTION_PAPER_BLUEPRINT_DELETE:             "QUESTION_PAPER_BLUEPRINT_DELETE",

    // ─── Employee (Staff Directory) ────────────────────────────────────
    EMPLOYEE_CREATE:                             "EMPLOYEE_CREATE",
    EMPLOYEE_UPDATE:                             "EMPLOYEE_UPDATE",
    EMPLOYEE_DELETE:                             "EMPLOYEE_DELETE",
    EMPLOYEE_IMPORT:                             "EMPLOYEE_IMPORT",

    // ─── Teacher Substitute ─────────────────────────────────────────────
    TEACHER_SUBSTITUTE_CREATE:                   "TEACHER_SUBSTITUTE_CREATE",
    TEACHER_SUBSTITUTE_UPDATE:                   "TEACHER_SUBSTITUTE_UPDATE",
    TEACHER_SUBSTITUTE_DELETE:                   "TEACHER_SUBSTITUTE_DELETE",

    // ─── Faculty Load ───────────────────────────────────────────────────
    FACULTY_LOAD_CREATE:                         "FACULTY_LOAD_CREATE",
    FACULTY_LOAD_UPDATE:                         "FACULTY_LOAD_UPDATE",
    FACULTY_LOAD_DELETE:                         "FACULTY_LOAD_DELETE",

    // ─── Leave Policy ───────────────────────────────────────────────────
    LEAVE_POLICY_CREATE:                         "LEAVE_POLICY_CREATE",
    LEAVE_POLICY_UPDATE:                         "LEAVE_POLICY_UPDATE",
    LEAVE_POLICY_DELETE:                         "LEAVE_POLICY_DELETE",

    // ─── Leave Type ─────────────────────────────────────────────────────
    LEAVE_TYPE_CREATE:                           "LEAVE_TYPE_CREATE",
    LEAVE_TYPE_UPDATE:                           "LEAVE_TYPE_UPDATE",
    LEAVE_TYPE_STATUS_UPDATE:                    "LEAVE_TYPE_STATUS_UPDATE",
    LEAVE_TYPE_DELETE:                           "LEAVE_TYPE_DELETE",

    // ─── Leave Request ──────────────────────────────────────────────────
    LEAVE_REQUEST_CREATE:                        "LEAVE_REQUEST_CREATE",
    LEAVE_REQUEST_STATUS_UPDATE:                 "LEAVE_REQUEST_STATUS_UPDATE",

    // ─── Approval Request ───────────────────────────────────────────────
    APPROVAL_REQUEST_CREATE:                     "APPROVAL_REQUEST_CREATE",
    APPROVAL_REQUEST_ACTION:                     "APPROVAL_REQUEST_ACTION",

    // ─── Leave Balance ──────────────────────────────────────────────────
    LEAVE_BALANCE_CREATE:                        "LEAVE_BALANCE_CREATE",
    LEAVE_BALANCE_UPDATE:                        "LEAVE_BALANCE_UPDATE",

    // ─── Library Creation & Category ─────────────────────────────────────
    LIBRARY_CREATE:                              "LIBRARY_CREATE",
    LIBRARY_UPDATE:                              "LIBRARY_UPDATE",
    LIBRARY_DELETE:                              "LIBRARY_DELETE",
    LIBRARY_STRUCTURE_BULK_GENERATE:             "LIBRARY_STRUCTURE_BULK_GENERATE",
    LIBRARY_CATEGORY_CREATE:                     "LIBRARY_CATEGORY_CREATE",
    LIBRARY_CATEGORY_UPDATE:                     "LIBRARY_CATEGORY_UPDATE",
    LIBRARY_CATEGORY_DELETE:                     "LIBRARY_CATEGORY_DELETE",

    // ─── Library Book & Inventory ────────────────────────────────────────
    LIBRARY_BOOK_CREATE:                         "LIBRARY_BOOK_CREATE",
    LIBRARY_BOOK_UPDATE:                         "LIBRARY_BOOK_UPDATE",
    LIBRARY_BOOK_DELETE:                         "LIBRARY_BOOK_DELETE",
    LIBRARY_BOOK_INVENTORY_DELETE:               "LIBRARY_BOOK_INVENTORY_DELETE",
    LIBRARY_BOOK_BULK_UPLOAD:                    "LIBRARY_BOOK_BULK_UPLOAD",

    // ─── Library Structure (Floor, Aisle, Rack, Row) ─────────────────────
    LIBRARY_FLOOR_CREATE:                        "LIBRARY_FLOOR_CREATE",
    LIBRARY_FLOOR_UPDATE:                        "LIBRARY_FLOOR_UPDATE",
    LIBRARY_FLOOR_DELETE:                        "LIBRARY_FLOOR_DELETE",
    LIBRARY_AISLE_CREATE:                        "LIBRARY_AISLE_CREATE",
    LIBRARY_AISLE_UPDATE:                        "LIBRARY_AISLE_UPDATE",
    LIBRARY_AISLE_DELETE:                        "LIBRARY_AISLE_DELETE",
    LIBRARY_RACK_CREATE:                         "LIBRARY_RACK_CREATE",
    LIBRARY_RACK_UPDATE:                         "LIBRARY_RACK_UPDATE",
    LIBRARY_RACK_DELETE:                         "LIBRARY_RACK_DELETE",
    LIBRARY_ROW_CREATE:                          "LIBRARY_ROW_CREATE",
    LIBRARY_ROW_UPDATE:                          "LIBRARY_ROW_UPDATE",
    LIBRARY_ROW_DELETE:                          "LIBRARY_ROW_DELETE",

    // ─── Library Issue Book Transaction ──────────────────────────────────
    LIBRARY_ISSUE_BOOK_CREATE:                   "LIBRARY_ISSUE_BOOK_CREATE",
    LIBRARY_ISSUE_BOOK_UPDATE:                   "LIBRARY_ISSUE_BOOK_UPDATE",
});
