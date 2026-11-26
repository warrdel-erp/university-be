// Canonical business event type names (stored in event.event_type)
export const AUDIT_EVENTS = Object.freeze({
    // ─── Campus ────────────────────────────────────────────────────────
    CAMPUS_CREATE                                : "Campus Create",
    CAMPUS_UPDATE                                : "Campus Update",
    CAMPUS_DELETE                                : "Campus Delete",

    // ─── Institute ──────────────────────────────────────────────────────
    INSTITUTE_CREATE                             : "Institute Create",
    INSTITUTE_UPDATE                             : "Institute Update",
    INSTITUTE_DELETE                             : "Institute Delete",
    AFFILIATED_UNIVERSITY_UPDATE                 : "Affiliated University Update",

    // ─── Course ────────────────────────────────────────────────────────
    COURSE_CREATE                                : "Course Create",
    COURSE_UPDATE                                : "Course Update",
    COURSE_DELETE                                : "Course Delete",
    COURSE_STATUS_CHANGE                         : "Course Status Change",

    // ─── Code Master ───────────────────────────────────────────────────
    CODE_MASTER_CREATE                           : "Code Master Create",
    CODE_MASTER_UPDATE                           : "Code Master Update",
    CODE_MASTER_DELETE                           : "Code Master Delete",

    // ─── Department ─────────────────────────────────────────────────────
    DEPARTMENT_CREATE                            : "Department Create",
    DEPARTMENT_UPDATE                            : "Department Update",
    DEPARTMENT_DELETE                            : "Department Delete",

    // ─── Department Positions ───────────────────────────────────────────
    DEPARTMENT_POSITION_CREATE                   : "Department Position Create",
    DEPARTMENT_POSITION_UPDATE                   : "Department Position Update",
    DEPARTMENT_POSITION_DELETE                   : "Department Position Delete",
    USER_DEPARTMENT_POSITION_CREATE              : "User Department Position Create",
    USER_DEPARTMENT_POSITION_UPDATE              : "User Department Position Update",
    USER_DEPARTMENT_POSITION_DELETE              : "User Department Position Delete",

    // ─── Governance Body ────────────────────────────────────────────────
    GOVERNANCE_BODY_CREATE                       : "Governance Body Create",
    GOVERNANCE_BODY_UPDATE                       : "Governance Body Update",
    GOVERNANCE_BODY_DELETE                       : "Governance Body Delete",

    // ─── Curriculum ─────────────────────────────────────────────────────
    CURRICULUM_CREATE                            : "Curriculum Create",
    CURRICULUM_UPDATE                            : "Curriculum Update",
    CURRICULUM_DELETE                            : "Curriculum Delete",
    CURRICULUM_PUBLISH_STATUS_CHANGE             : "Curriculum Publish Status Change",
    CURRICULUM_SUBJECT_MAP                       : "Curriculum Subject Map",
    CURRICULUM_SUBJECT_MAPPING_UPDATE            : "Curriculum Subject Mapping Update",
    CURRICULUM_SUBJECT_UNMAP                     : "Curriculum Subject Unmap",
    CURRICULUM_BATCH_MAP                         : "Curriculum Batch Map",
    CURRICULUM_BATCH_UNMAP                       : "Curriculum Batch Unmap",

    // ─── Curriculum Category ────────────────────────────────────────────
    CURRICULUM_CATEGORY_CREATE                   : "Curriculum Category Create",
    CURRICULUM_CATEGORY_UPDATE                   : "Curriculum Category Update",
    CURRICULUM_CATEGORY_DELETE                   : "Curriculum Category Delete",

    // ─── Subject Component ──────────────────────────────────────────────
    SUBJECT_COMPONENT_CREATE                     : "Subject Component Create",
    SUBJECT_COMPONENT_UPDATE                     : "Subject Component Update",
    SUBJECT_COMPONENT_DELETE                     : "Subject Component Delete",

    // ─── Elective Pool ──────────────────────────────────────────────────
    ELECTIVE_POOL_CREATE                         : "Elective Pool Create",
    ELECTIVE_POOL_UPDATE                         : "Elective Pool Update",
    ELECTIVE_POOL_DELETE                         : "Elective Pool Delete",
    ELECTIVE_POOL_SUBJECT_MAP                    : "Elective Pool Subject Map",
    ELECTIVE_POOL_SUBJECT_UNMAP                  : "Elective Pool Subject Unmap",

    // ─── Subject ────────────────────────────────────────────────────────
    SUBJECT_CREATE                               : "Subject Create",
    SUBJECT_UPDATE                               : "Subject Update",
    SUBJECT_DELETE                               : "Subject Delete",
    SUBJECT_TERM_ASSIGN                          : "Subject Term Assign",

    // ─── Class Section ──────────────────────────────────────────────────
    CLASS_SECTION_CREATE                         : "Class Section Create",
    CLASS_SECTION_UPDATE                         : "Class Section Update",
    CLASS_SECTION_DELETE                         : "Class Section Delete",

    // ─── Academic Group Scope ───────────────────────────────────────────
    ACADEMIC_GROUP_SCOPE_CREATE                  : "Academic Group Scope Create",
    ACADEMIC_GROUP_SCOPE_UPDATE                  : "Academic Group Scope Update",
    ACADEMIC_GROUP_SCOPE_DELETE                  : "Academic Group Scope Delete",
    ACADEMIC_GROUP_SCOPE_PUBLISH                 : "Academic Group Scope Publish",

    // ─── Academic Group ─────────────────────────────────────────────────
    ACADEMIC_GROUP_CREATE                        : "Academic Group Create",
    ACADEMIC_GROUP_UPDATE                        : "Academic Group Update",
    ACADEMIC_GROUP_DELETE                        : "Academic Group Delete",
    ACADEMIC_GROUP_USER_ASSIGN                   : "Academic Group User Assign",
    ACADEMIC_GROUP_USER_UPDATE                   : "Academic Group User Update",
    ACADEMIC_GROUP_USER_REMOVE                   : "Academic Group User Remove",
    ACADEMIC_GROUP_STUDENT_ASSIGN                : "Academic Group Student Assign",
    ACADEMIC_GROUP_STUDENT_REMOVE                : "Academic Group Student Remove",

    // ─── Teacher Mapping ────────────────────────────────────────────────
    TEACHER_SUBJECT_MAP                          : "Teacher Subject Map",
    TEACHER_SUBJECT_UPDATE                       : "Teacher Subject Update",
    TEACHER_SUBJECT_UNMAP                        : "Teacher Subject Unmap",
    TEACHER_SECTION_MAP                          : "Teacher Section Map",
    TEACHER_SECTION_UPDATE                       : "Teacher Section Update",
    TEACHER_SECTION_UNMAP                        : "Teacher Section Unmap",

    // ─── Timetable Routine / Cell ───────────────────────────────────────
    TIMETABLE_ROUTINE_CREATE                     : "Timetable Routine Create",
    TIMETABLE_ROUTINE_UPDATE                     : "Timetable Routine Update",
    TIMETABLE_ROUTINE_DELETE                     : "Timetable Routine Delete",
    TIMETABLE_ROUTINE_CLONE                      : "Timetable Routine Clone",
    TIMETABLE_ROUTINE_PUBLISH                    : "Timetable Routine Publish",
    TIMETABLE_CELL_CREATE                        : "Timetable Cell Create",
    TIMETABLE_CELL_UPDATE                        : "Timetable Cell Update",
    TIMETABLE_CELL_DELETE                        : "Timetable Cell Delete",
    TIMETABLE_DATEWISE_CELL_UPDATE               : "Timetable Datewise Cell Update",
    TIMETABLE_FILL_MISSING_SUBJECTS              : "Timetable Fill Missing Subjects",
    TIMETABLE_TEACHER_DELETE                     : "Timetable Teacher Delete",

    // ─── Timetable Academic Group Mapping ───────────────────────────────
    TIMETABLE_STRUCTURE_MAPPING_CREATE           : "Timetable Structure Mapping Create",
    TIMETABLE_STRUCTURE_MAPPING_DELETE           : "Timetable Structure Mapping Delete",
    TIMETABLE_ACADEMIC_GROUP_ROUTINE_CREATE      : "Timetable Academic Group Routine Create",

    // ─── Attendance ─────────────────────────────────────────────────────
    ATTENDANCE_MARK                              : "Attendance Mark",
    ATTENDANCE_UPDATE                            : "Attendance Update",
    ATTENDANCE_COPY_PERIOD                       : "Attendance Copy Period",
    ATTENDANCE_IMPORT                            : "Attendance Import",

    // ─── Holiday ────────────────────────────────────────────────────────
    HOLIDAY_CREATE                               : "Holiday Create",
    HOLIDAY_UPDATE                               : "Holiday Update",
    HOLIDAY_DELETE                               : "Holiday Delete",

    // ─── Schedule ───────────────────────────────────────────────────────
    SCHEDULE_CREATE                              : "Schedule Create",
    SCHEDULE_UPDATE                              : "Schedule Update",
    SCHEDULE_DELETE                              : "Schedule Delete",
    SCHEDULE_TEACHER_ASSIGN                      : "Schedule Teacher Assign",
    SCHEDULE_ATTENDANCE_MARK                     : "Schedule Attendance Mark",
    SCHEDULE_ATTENDANCE_UPDATE                   : "Schedule Attendance Update",

    // ─── Lecture Window ─────────────────────────────────────────────────
    LECTURE_WINDOW_CREATE                        : "Lecture Window Create",
    LECTURE_WINDOW_UPDATE                        : "Lecture Window Update",
    LECTURE_WINDOW_DELETE                        : "Lecture Window Delete",

    // ─── Lesson Plan, Topic & Mapping ───────────────────────────────────
    LESSON_CREATE                                : "Lesson Create",
    LESSON_UPDATE                                : "Lesson Update",
    LESSON_DELETE                                : "Lesson Delete",
    TOPIC_CREATE                                 : "Topic Create",
    TOPIC_UPDATE                                 : "Topic Update",
    TOPIC_DELETE                                 : "Topic Delete",
    LESSON_MAPPING_CREATE                        : "Lesson Mapping Create",
    LESSON_MAPPING_UPDATE                        : "Lesson Mapping Update",
    LESSON_MAPPING_DELETE                        : "Lesson Mapping Delete",
    LESSON_MAPPING_COPY                          : "Lesson Mapping Copy",
    LESSON_WINDOW_LINK                           : "Lesson Window Link",

    // ─── Fee Type Catalog ───────────────────────────────────────────────
    FEE_TYPE_CATALOG_CREATE                      : "Fee Type Catalog Create",
    FEE_TYPE_CATALOG_UPDATE                      : "Fee Type Catalog Update",
    FEE_TYPE_CATALOG_DELETE                      : "Fee Type Catalog Delete",

    // ─── Fee Type Category ──────────────────────────────────────────────
    FEE_TYPE_CATEGORY_CREATE                     : "Fee Type Category Create",
    FEE_TYPE_CATEGORY_UPDATE                     : "Fee Type Category Update",
    FEE_TYPE_CATEGORY_DELETE                     : "Fee Type Category Delete",

    // ─── Fee Policy ─────────────────────────────────────────────────────
    FEE_POLICY_CREATE                            : "Fee Policy Create",
    FEE_POLICY_UPDATE                            : "Fee Policy Update",
    FEE_POLICY_PUBLISH                           : "Fee Policy Publish",
    FEE_POLICY_UNPUBLISH                         : "Fee Policy Unpublish",
    FEE_POLICY_DELETE                            : "Fee Policy Delete",
    FEE_POLICY_STUDENT_MAP                       : "Fee Policy Student Map",
    FEE_POLICY_STUDENT_UNMAP                     : "Fee Policy Student Unmap",

    // ─── Fee Plan Item & Billing ────────────────────────────────────────
    FEE_PLAN_ITEM_CREATE                         : "Fee Plan Item Create",
    FEE_PLAN_ITEM_UPDATE                         : "Fee Plan Item Update",
    FEE_PLAN_ITEM_DELETE                         : "Fee Plan Item Delete",
    FEE_PLAN_SUB_ITEM_CREATE                     : "Fee Plan Sub Item Create",
    FEE_PLAN_SUB_ITEM_DELETE                     : "Fee Plan Sub Item Delete",
    FEE_PLAN_PUBLISH                             : "Fee Plan Publish",
    FEE_PLAN_UNPUBLISH                           : "Fee Plan Unpublish",

    // ─── Billing Schedule ───────────────────────────────────────────────
    BILLING_SCHEDULE_CREATE                      : "Billing Schedule Create",
    BILLING_SCHEDULE_UPDATE                      : "Billing Schedule Update",
    BILLING_SCHEDULE_STATUS_UPDATE               : "Billing Schedule Status Update",
    BILLING_SCHEDULE_DELETE                      : "Billing Schedule Delete",
    BILLING_SCHEDULE_SUB_ITEM_CREATE             : "Billing Schedule Sub Item Create",
    BILLING_SCHEDULE_SUB_ITEM_DELETE             : "Billing Schedule Sub Item Delete",
    BILLING_SCHEDULE_PAYMENT_TERM_CREATE         : "Billing Schedule Payment Term Create",
    BILLING_SCHEDULE_PAYMENT_TERM_DELETE         : "Billing Schedule Payment Term Delete",

    // ─── Billing Schedule Payment Terms ─────────────────────────────────
    PAYMENT_TERM_CREATE                          : "Payment Term Create",
    PAYMENT_TERM_UPDATE                          : "Payment Term Update",
    PAYMENT_TERM_DELETE                          : "Payment Term Delete",

    // ─── Student Fee Invoice ────────────────────────────────────────────
    STUDENT_FEE_INVOICE_GENERATE                 : "Student Fee Invoice Generate",
    STUDENT_FEE_INVOICE_ADHOC_GENERATE           : "Student Fee Invoice Adhoc Generate",

    // ─── Student Fee Payment ────────────────────────────────────────────
    STUDENT_FEE_PAYMENT_RECORD                   : "Student Fee Payment Record",

    // ─── Student ──────────────────────────────────────────────────────
    STUDENT_CREATE                               : "Student Create",
    STUDENT_UPDATE                               : "Student Update",
    STUDENT_DELETE                               : "Student Delete",
    STUDENT_IMPORT                               : "Student Import",
    STUDENT_PROMOTE                              : "Student Promote",
    STUDENT_COURSE_MAP                           : "Student Course Map",
    STUDENT_SECTION_MAP                          : "Student Section Map",
    STUDENT_ELECTIVE_MAP                         : "Student Elective Map",

    // ─── Exam Schedule ────────────────────────────────────────────────
    EXAM_SCHEDULE_CREATE                         : "Exam Schedule Create",
    EXAM_SCHEDULE_UPDATE                         : "Exam Schedule Update",
    EXAM_SCHEDULE_DELETE                         : "Exam Schedule Delete",

    // ─── Examination Session ──────────────────────────────────────────
    EXAMINATION_SESSION_PUBLISH                  : "Examination Session Publish",

    // ─── Exam Room ────────────────────────────────────────────────────
    EXAM_ROOM_ALLOCATE                           : "Exam Room Allocate",
    EXAM_ROOM_UNMAP                              : "Exam Room Unmap",

    // ─── Exam Seat ────────────────────────────────────────────────────
    EXAM_SEAT_ALLOCATE                           : "Exam Seat Allocate",
    EXAM_SEAT_REALLOCATE                         : "Exam Seat Reallocate",

    // ─── Hall Ticket ──────────────────────────────────────────────────
    HALL_TICKET_GENERATE                         : "Hall Ticket Generate",
    HALL_TICKET_REGENERATE                       : "Hall Ticket Regenerate",
    HALL_TICKET_PUBLISH                          : "Hall Ticket Publish",
    HALL_TICKET_BLOCK                            : "Hall Ticket Block",

    // ─── Result ───────────────────────────────────────────────────────
    RESULT_GENERATE                              : "Result Generate",
    RESULT_PUBLISH                               : "Result Publish",

    // ─── Hall Ticket (eligibility override) ───────────────────────────
    HALL_TICKET_MARK_ELIGIBLE                    : "Hall Ticket Mark Eligible",

    // ─── Exam Setup Type ──────────────────────────────────────────────
    EXAM_SETUP_TYPE_CREATE                       : "Exam Setup Type Create",
    EXAM_SETUP_TYPE_UPDATE                       : "Exam Setup Type Update",
    EXAM_SETUP_TYPE_DELETE                       : "Exam Setup Type Delete",

    // ─── Grading Schema ────────────────────────────────────────────────
    GRADING_SCHEMA_CREATE                        : "Grading Schema Create",
    GRADING_SCHEMA_UPDATE                        : "Grading Schema Update",
    GRADING_SCHEMA_DELETE                        : "Grading Schema Delete",
    GRADING_SCHEMA_GRADE_CREATE                  : "Grading Schema Grade Create",
    GRADING_SCHEMA_GRADE_UPDATE                  : "Grading Schema Grade Update",
    GRADING_SCHEMA_GRADE_DELETE                  : "Grading Schema Grade Delete",
    GRADING_SCHEMA_PUBLISH                       : "Grading Schema Publish",
    GRADING_SCHEMA_DRAFT                         : "Grading Schema Draft",

    // ─── Academic Regulation ───────────────────────────────────────────
    ACADEMIC_REGULATION_CREATE                   : "Academic Regulation Create",
    ACADEMIC_REGULATION_UPDATE                   : "Academic Regulation Update",
    ACADEMIC_REGULATION_DELETE                   : "Academic Regulation Delete",
    ACADEMIC_REGULATION_COURSE_MAP               : "Academic Regulation Course Map",
    ACADEMIC_REGULATION_COURSE_UNMAP             : "Academic Regulation Course Unmap",

    // ─── Assessment Plan ───────────────────────────────────────────────
    ASSESSMENT_PLAN_CREATE                       : "Assessment Plan Create",
    ASSESSMENT_PLAN_UPDATE                       : "Assessment Plan Update",
    ASSESSMENT_PLAN_DELETE                       : "Assessment Plan Delete",
    ASSESSMENT_PLAN_COMPONENT_CREATE             : "Assessment Plan Component Create",
    ASSESSMENT_PLAN_COMPONENT_UPDATE             : "Assessment Plan Component Update",
    ASSESSMENT_PLAN_COMPONENT_DELETE             : "Assessment Plan Component Delete",
    ASSESSMENT_PLAN_SUBJECT_MAP                  : "Assessment Plan Subject Map",
    ASSESSMENT_PLAN_SUBJECT_UNMAP                : "Assessment Plan Subject Unmap",
    ASSESSMENT_PLAN_BATCH_PUBLISH                : "Assessment Plan Batch Publish",
    ASSESSMENT_PLAN_BATCH_UNFREEZE               : "Assessment Plan Batch Unfreeze",

    // ─── Internal Assessment ───────────────────────────────────────────
    INTERNAL_ASSESSMENT_CREATE                   : "Internal Assessment Create",
    INTERNAL_ASSESSMENT_UPDATE                   : "Internal Assessment Update",
    INTERNAL_ASSESSMENT_EVALUATION_UPSERT        : "Internal Assessment Evaluation Upsert",
    INTERNAL_ASSESSMENT_FINAL_RESULT_CALCULATE   : "Internal Assessment Final Result Calculate",
    INTERNAL_ASSESSMENT_FINAL_RESULT_SUBMIT      : "Internal Assessment Final Result Submit",

    // ─── Examination Session ───────────────────────────────────────────
    EXAMINATION_SESSION_CREATE                   : "Examination Session Create",
    EXAMINATION_SESSION_UPDATE                   : "Examination Session Update",
    EXAMINATION_SESSION_DELETE                   : "Examination Session Delete",
    EXAMINATION_SESSION_TERM_CREATE              : "Examination Session Term Create",
    EXAMINATION_SESSION_TERM_DELETE              : "Examination Session Term Delete",
    EXAMINATION_SESSION_MARKS_SAVE               : "Examination Session Marks Save",
    EXAMINATION_SESSION_MARKS_STATUS_UPDATE      : "Examination Session Marks Status Update",

    // ─── Examination Session Slot ──────────────────────────────────────
    EXAMINATION_SESSION_SLOT_CREATE              : "Examination Session Slot Create",
    EXAMINATION_SESSION_SLOT_UPDATE              : "Examination Session Slot Update",
    EXAMINATION_SESSION_SLOT_DELETE              : "Examination Session Slot Delete",

    // ─── Evaluation ────────────────────────────────────────────────────
    EVALUATION_CREATE                            : "Evaluation Create",
    EVALUATION_UPDATE                            : "Evaluation Update",
    EVALUATION_DELETE                            : "Evaluation Delete",

    // ─── Exam Invigilator Assignment ───────────────────────────────────
    EXAM_INVIGILATOR_ASSIGNMENT_CREATE           : "Exam Invigilator Assignment Create",
    EXAM_INVIGILATOR_ASSIGNMENT_UPDATE           : "Exam Invigilator Assignment Update",
    EXAM_INVIGILATOR_ASSIGNMENT_DELETE           : "Exam Invigilator Assignment Delete",

    // ─── Exam Result ───────────────────────────────────────────────────
    EXAM_RESULT_CREATE                           : "Exam Result Create",
    EXAM_RESULT_PUBLISH                          : "Exam Result Publish",
    EXAM_RESULT_ZSCORE_RESET                     : "Exam Result Z-Score Reset",

    // ─── Exam Room Material Bundle ─────────────────────────────────────
    EXAM_ROOM_MATERIAL_BUNDLE_CREATE             : "Exam Room Material Bundle Create",
    EXAM_ROOM_MATERIAL_BUNDLE_UPDATE             : "Exam Room Material Bundle Update",
    EXAM_ROOM_MATERIAL_BUNDLE_STATUS_UPDATE      : "Exam Room Material Bundle Status Update",

    // ─── Exam Schedule & Room Capacity ─────────────────────────────────
    EXAM_ROOM_CAPACITY_CREATE                    : "Exam Room Capacity Create",
    EXAM_ROOM_CAPACITY_UPDATE                    : "Exam Room Capacity Update",
    EXAM_ROOM_CAPACITY_DELETE                    : "Exam Room Capacity Delete",
    EXAM_SEAT_ALLOCATE                           : "Exam Seat Allocate",
    EXAM_SCHEDULE_PUBLISH                        : "Exam Schedule Publish",

    // ─── Class Room (Room / Section) ────────────────────────────────────
    CLASS_ROOM_CREATE                            : "Class Room Create",
    CLASS_ROOM_UPDATE                            : "Class Room Update",
    CLASS_ROOM_DELETE                            : "Class Room Delete",

    // ─── Answer Sheet QR ────────────────────────────────────────────────
    ANSWER_SHEET_QR_BULK_CREATE                  : "Answer Sheet QR Bulk Create",
    ANSWER_SHEET_QR_MAP                          : "Answer Sheet QR Map",
    ANSWER_SHEET_QR_ASSIGN_TEACHERS              : "Answer Sheet QR Assign Teachers",
    ANSWER_SHEET_QR_MARKS_ASSIGN                 : "Answer Sheet QR Marks Assign",
    ANSWER_SHEET_QR_MARKS_FINAL_SUBMIT           : "Answer Sheet QR Marks Final Submit",
    ANSWER_SHEET_ANNOTATION_SAVE                 : "Answer Sheet Annotation Save",

    // ─── Question Paper ─────────────────────────────────────────────────
    QUESTION_PAPER_CREATE                        : "Question Paper Create",
    QUESTION_PAPER_UPDATE                        : "Question Paper Update",
    QUESTION_PAPER_DELETE                        : "Question Paper Delete",
    QUESTION_PAPER_GENERATE                      : "Question Paper Generate",
    QUESTION_PAPER_APPROVE                       : "Question Paper Approve",
    QUESTION_PAPER_FINAL_APPROVE                 : "Question Paper Final Approve",

    // ─── Question Bank ──────────────────────────────────────────────────
    QUESTION_BANK_CREATE                         : "Question Bank Create",
    QUESTION_BANK_UPDATE                         : "Question Bank Update",
    QUESTION_BANK_DELETE                         : "Question Bank Delete",
    QUESTION_BANK_BULK_APPROVE                   : "Question Bank Bulk Approve",
    QUESTION_BANK_BULK_REJECT                    : "Question Bank Bulk Reject",

    // ─── Question Paper Blueprint ───────────────────────────────────────
    QUESTION_PAPER_BLUEPRINT_CREATE              : "Question Paper Blueprint Create",
    QUESTION_PAPER_BLUEPRINT_DELETE              : "Question Paper Blueprint Delete",

    // ─── Employee (Staff Directory) ────────────────────────────────────
    EMPLOYEE_CREATE                              : "Employee Create",
    EMPLOYEE_UPDATE                              : "Employee Update",
    EMPLOYEE_DELETE                              : "Employee Delete",
    EMPLOYEE_IMPORT                              : "Employee Import",

    // ─── Teacher Substitute ─────────────────────────────────────────────
    TEACHER_SUBSTITUTE_CREATE                    : "Teacher Substitute Create",
    TEACHER_SUBSTITUTE_UPDATE                    : "Teacher Substitute Update",
    TEACHER_SUBSTITUTE_DELETE                    : "Teacher Substitute Delete",

    // ─── Faculty Load ───────────────────────────────────────────────────
    FACULTY_LOAD_CREATE                          : "Faculty Load Create",
    FACULTY_LOAD_UPDATE                          : "Faculty Load Update",
    FACULTY_LOAD_DELETE                          : "Faculty Load Delete",

    // ─── Leave Policy ───────────────────────────────────────────────────
    LEAVE_POLICY_CREATE                          : "Leave Policy Create",
    LEAVE_POLICY_UPDATE                          : "Leave Policy Update",
    LEAVE_POLICY_DELETE                          : "Leave Policy Delete",

    // ─── Leave Type ─────────────────────────────────────────────────────
    LEAVE_TYPE_CREATE                            : "Leave Type Create",
    LEAVE_TYPE_UPDATE                            : "Leave Type Update",
    LEAVE_TYPE_STATUS_UPDATE                     : "Leave Type Status Update",
    LEAVE_TYPE_DELETE                            : "Leave Type Delete",

    // ─── Leave Request ──────────────────────────────────────────────────
    LEAVE_REQUEST_CREATE                         : "Leave Request Create",
    LEAVE_REQUEST_STATUS_UPDATE                  : "Leave Request Status Update",

    // ─── Approval Request ───────────────────────────────────────────────
    APPROVAL_REQUEST_CREATE                      : "Approval Request Create",
    APPROVAL_REQUEST_ACTION                      : "Approval Request Action",

    // ─── Leave Balance ──────────────────────────────────────────────────
    LEAVE_BALANCE_CREATE                         : "Leave Balance Create",
    LEAVE_BALANCE_UPDATE                         : "Leave Balance Update",

    // ─── Library Creation & Category ─────────────────────────────────────
    LIBRARY_CREATE                               : "Library Create",
    LIBRARY_UPDATE                               : "Library Update",
    LIBRARY_DELETE                               : "Library Delete",
    LIBRARY_STRUCTURE_BULK_GENERATE              : "Library Structure Bulk Generate",
    LIBRARY_CATEGORY_CREATE                      : "Library Category Create",
    LIBRARY_CATEGORY_UPDATE                      : "Library Category Update",
    LIBRARY_CATEGORY_DELETE                      : "Library Category Delete",

    // ─── Library Book & Inventory ────────────────────────────────────────
    LIBRARY_BOOK_CREATE                          : "Library Book Create",
    LIBRARY_BOOK_UPDATE                          : "Library Book Update",
    LIBRARY_BOOK_DELETE                          : "Library Book Delete",
    LIBRARY_BOOK_INVENTORY_DELETE                : "Library Book Inventory Delete",
    LIBRARY_BOOK_BULK_UPLOAD                     : "Library Book Bulk Upload",

    // ─── Library Structure (Floor, Aisle, Rack, Row) ─────────────────────
    LIBRARY_FLOOR_CREATE                         : "Library Floor Create",
    LIBRARY_FLOOR_UPDATE                         : "Library Floor Update",
    LIBRARY_FLOOR_DELETE                         : "Library Floor Delete",
    LIBRARY_AISLE_CREATE                         : "Library Aisle Create",
    LIBRARY_AISLE_UPDATE                         : "Library Aisle Update",
    LIBRARY_AISLE_DELETE                         : "Library Aisle Delete",
    LIBRARY_RACK_CREATE                          : "Library Rack Create",
    LIBRARY_RACK_UPDATE                          : "Library Rack Update",
    LIBRARY_RACK_DELETE                          : "Library Rack Delete",
    LIBRARY_ROW_CREATE                           : "Library Row Create",
    LIBRARY_ROW_UPDATE                           : "Library Row Update",
    LIBRARY_ROW_DELETE                           : "Library Row Delete",

    // ─── Library Issue Book Transaction ──────────────────────────────────
    LIBRARY_ISSUE_BOOK_CREATE                    : "Library Issue Book Create",
    LIBRARY_ISSUE_BOOK_UPDATE                    : "Library Issue Book Update",

    // ─── Dormitory: Room Type ─────────────────────────────────────────────
    ROOM_TYPE_CREATE                             : "Room Type Create",
    ROOM_TYPE_UPDATE                             : "Room Type Update",
    ROOM_TYPE_DELETE                             : "Room Type Delete",

    // ─── Dormitory: Dormitory List ────────────────────────────────────────
    DORMITORY_LIST_CREATE                        : "Dormitory List Create",
    DORMITORY_LIST_UPDATE                        : "Dormitory List Update",
    DORMITORY_LIST_DELETE                        : "Dormitory List Delete",

    // ─── Dormitory: Add Dormitory (Room) ──────────────────────────────────
    DORMITORY_ROOM_CREATE                        : "Dormitory Room Create",
    DORMITORY_ROOM_UPDATE                        : "Dormitory Room Update",
    DORMITORY_ROOM_DELETE                        : "Dormitory Room Delete",

    // ─── Transport: Route ─────────────────────────────────────────────────
    TRANSPORT_ROUTE_CREATE                       : "Transport Route Create",
    TRANSPORT_ROUTE_UPDATE                       : "Transport Route Update",
    TRANSPORT_ROUTE_DELETE                       : "Transport Route Delete",

    // ─── Transport: Vehicle ───────────────────────────────────────────────
    VEHICLE_CREATE                               : "Vehicle Create",
    VEHICLE_UPDATE                               : "Vehicle Update",
    VEHICLE_DELETE                               : "Vehicle Delete",

    // ─── Transport: Assign Vehicle ────────────────────────────────────────
    ASSIGN_VEHICLE_CREATE                        : "Assign Vehicle Create",
    ASSIGN_VEHICLE_UPDATE                        : "Assign Vehicle Update",
    ASSIGN_VEHICLE_DELETE                        : "Assign Vehicle Delete",

    // ─── Student: Previous Academic ────────────────────────────────────────
    PREVIOUS_ACADEMIC_MARKS_UPLOAD               : "Previous Academic Marks Upload",

    // ─── Organization: Head ────────────────────────────────────────────────
    HEAD_CREATE                                  : "Head Create",
    HEAD_UPDATE                                  : "Head Update",
    HEAD_DELETE                                  : "Head Delete",

    // ─── Organization: Building ────────────────────────────────────────────
    BUILDING_CREATE                              : "Building Create",
    BUILDING_UPDATE                              : "Building Update",
    BUILDING_DELETE                              : "Building Delete",

    // ─── Organization: Floor ───────────────────────────────────────────────
    FLOOR_CREATE                                 : "Floor Create",
    FLOOR_UPDATE                                 : "Floor Update",
    FLOOR_DELETE                                 : "Floor Delete",

    // ─── Organization: Staff ───────────────────────────────────────────────
    STAFF_CREATE                                 : "Staff Create",
    STAFF_UPDATE                                 : "Staff Update",
    STAFF_DELETE                                 : "Staff Delete",

    // ─── Asset Management: Asset ───────────────────────────────────────────
    ASSET_CREATE                                 : "Asset Create",
    ASSET_UPDATE                                 : "Asset Update",
    ASSET_DELETE                                 : "Asset Delete",
    ASSET_INVENTORY_DELETE                       : "Asset Inventory Delete",

    // ─── Asset Management: Asset Issue & Return ────────────────────────────
    ASSET_ISSUE_CREATE                           : "Asset Issue Create",
    ASSET_ISSUE_UPDATE                           : "Asset Issue Update",
    ASSET_RETURN_CREATE                          : "Asset Return Create",

    // ─── Asset Management: AMC Vendor ──────────────────────────────────────
    AMC_VENDOR_CREATE                            : "AMC Vendor Create",
    AMC_VENDOR_UPDATE                            : "AMC Vendor Update",
    AMC_VENDOR_DELETE                            : "AMC Vendor Delete",

    // ─── Asset Management: AMC Contract ────────────────────────────────────
    AMC_CONTRACT_CREATE                          : "AMC Contract Create",
    AMC_CONTRACT_UPDATE                          : "AMC Contract Update",
    AMC_CONTRACT_DELETE                          : "AMC Contract Delete",
    AMC_CONTRACT_SUBMIT                          : "AMC Contract Submit",
    AMC_CONTRACT_APPROVE                         : "AMC Contract Approve",

    // ─── Asset Management: AMC Service Ticket ──────────────────────────────
    AMC_SERVICE_TICKET_CREATE                    : "AMC Service Ticket Create",
    AMC_SERVICE_TICKET_UPDATE                    : "AMC Service Ticket Update",
    AMC_SERVICE_TICKET_DELETE                    : "AMC Service Ticket Delete",

    // ─── Notice ─────────────────────────────────────────────────────────────
    NOTICE_CREATE                                : "Notice Create",
    NOTICE_UPDATE                                : "Notice Update",
    NOTICE_DELETE                                : "Notice Delete",

    // ─── Job Settings ───────────────────────────────────────────────────────
    JOB_TYPE_CREATE                              : "Job Type Create",
    JOB_TYPE_UPDATE                              : "Job Type Update",
    JOB_TYPE_DELETE                              : "Job Type Delete",

    // ─── Job ────────────────────────────────────────────────────────────────
    JOB_CREATE                                   : "Job Create",
    JOB_UPDATE                                   : "Job Update",
    JOB_DELETE                                   : "Job Delete",

    // ─── Academic Year ──────────────────────────────────────────────────────
    ACADEMIC_YEAR_CREATE                         : "Academic Year Create",
    ACADEMIC_YEAR_UPDATE                         : "Academic Year Update",
    ACADEMIC_YEAR_DELETE                         : "Academic Year Delete",
    ACADEMIC_YEAR_ACTIVATE_AND_COPY              : "Academic Year Activate and Copy",

    // ─── Academic Session ───────────────────────────────────────────────────
    SESSION_CREATE                               : "Session Create",
    SESSION_UPDATE                               : "Session Update",
    SESSION_DELETE                               : "Session Delete",
    SESSION_COURSE_MAP                           : "Session Course Map",
    SESSION_COURSE_UNMAP                         : "Session Course Unmap",
    SESSION_COURSE_MAPPING_UPDATE                : "Session Course Mapping Update",
    SESSION_BATCH_MAP                            : "Session Batch Map",
    SESSION_BATCH_UNMAP                          : "Session Batch Unmap",

    // ─── Batch ──────────────────────────────────────────────────────────────
    BATCH_CREATE                                 : "Batch Create",
    BATCH_UPDATE                                 : "Batch Update",
    BATCH_DELETE                                 : "Batch Delete",
    BATCH_PUBLISH                                : "Batch Publish",

    // ─── Specialization ─────────────────────────────────────────────────────
    SPECIALIZATION_UPDATE                        : "Specialization Update",

    // ─── Credit ─────────────────────────────────────────────────────────────
    CREDIT_CREATE                                : "Credit Create",
    CREDIT_UPDATE                                : "Credit Update",
    CREDIT_DELETE                                : "Credit Delete",

    // ─── Syllabus ───────────────────────────────────────────────────────────
    SYLLABUS_CREATE                              : "Syllabus Create",
    SYLLABUS_UPDATE                              : "Syllabus Update",
    SYLLABUS_DELETE                              : "Syllabus Delete",
    SYLLABUS_UNIT_CREATE                         : "Syllabus Unit Create",
    SYLLABUS_UNIT_UPDATE                         : "Syllabus Unit Update",
    SYLLABUS_UNIT_DELETE                         : "Syllabus Unit Delete",

    // ─── Subject Weightage ──────────────────────────────────────────────────
    SUBJECT_WEIGHTAGE_BULK_CREATE                : "Subject Weightage Bulk Create",

    // ─── Program Outcome (PO) ───────────────────────────────────────────────
    PO_CREATE                                    : "PO Create",
    PO_UPDATE                                    : "PO Update",
    PO_DELETE                                    : "PO Delete",

    // ─── Course Outcome (CO) ────────────────────────────────────────────────
    CO_CREATE                                    : "CO Create",
    CO_UPDATE                                    : "CO Update",
    CO_DELETE                                    : "CO Delete",
    CO_WEIGHTAGE_CREATE                          : "CO Weightage Create",
    CO_WEIGHTAGE_UPDATE                          : "CO Weightage Update",

    // ─── Roles & Permissions ────────────────────────────────────────────────
    ROLE_CREATE                                  : "Role Create",
    ROLE_UPDATE                                  : "Role Update",
    ROLE_DELETE                                  : "Role Delete",
    ROLE_PERMISSIONS_ASSIGN                      : "Role Permissions Assign",
    PERMISSION_CREATE                            : "Permission Create",
    PERMISSION_UPDATE                            : "Permission Update",
    PERMISSION_DELETE                            : "Permission Delete",
    ROLE_PERMISSION_CREATE                       : "Role Permission Create",
    ROLE_PERMISSION_UPDATE                       : "Role Permission Update",
    ROLE_PERMISSION_DELETE                       : "Role Permission Delete",
    USER_ROLE_PERMISSION_CREATE                  : "User Role Permission Create",
    USER_ROLE_PERMISSION_UPDATE                  : "User Role Permission Update",
    USER_ROLE_PERMISSION_DELETE                  : "User Role Permission Delete",
    USER_ROLE_ASSIGN                             : "User Role Assign",
    USER_ROLE_REMOVE                             : "User Role Remove",

    // ─── User Management ────────────────────────────────────────────────────
    USER_REGISTER                                : "User Register",
    USER_STUDENT_REGISTER                        : "User Student Register",
    USER_EMPLOYEE_REGISTER                       : "User Employee Register",
    USER_PASSWORD_CHANGE                         : "User Password Change",
    USER_STATUS_CHANGE                           : "User Status Change",
    USER_DEFAULTS_SAVE                           : "User Defaults Save",
    USER_INITIAL_SETUP                           : "User Initial Setup",
    USER_FULL_ACCESS_GRANT                       : "User Full Access Grant",

    // ─── Curriculum Elective Requirements & Assignments ─────────────────────
    CURRICULUM_ELECTIVE_REQUIREMENT_CREATE       : "Curriculum Elective Requirement Create",
    CURRICULUM_ELECTIVE_REQUIREMENT_UPDATE       : "Curriculum Elective Requirement Update",
    CURRICULUM_ELECTIVE_REQUIREMENT_STATUS_TOGGLE: "Curriculum Elective Requirement Status Toggle",
    CURRICULUM_ELECTIVE_REQUIREMENT_DELETE       : "Curriculum Elective Requirement Delete",
    CURRICULUM_ELECTIVE_STUDENT_ASSIGN           : "Curriculum Elective Student Assign",
    CURRICULUM_ELECTIVE_STUDENT_BULK_ASSIGN      : "Curriculum Elective Student Bulk Assign",
    CURRICULUM_ELECTIVE_STUDENT_UNASSIGN         : "Curriculum Elective Student Unassign",
    CURRICULUM_ELECTIVE_STUDENT_BULK_UNASSIGN    : "Curriculum Elective Student Bulk Unassign",
    ELECTIVE_SUBJECT_CREATE                      : "Elective Subject Create",
    ELECTIVE_SUBJECT_UPDATE                      : "Elective Subject Update",
    ELECTIVE_SUBJECT_DELETE                      : "Elective Subject Delete",
    ELECTIVE_SUBJECT_STUDENTS_MAP                : "Elective Subject Students Map",
    ELECTIVE_SUBJECT_STUDENT_UNMAP               : "Elective Subject Student Unmap",

    // ─── Exam Attendance & Teacher Exam Assignment ──────────────────────────
    EXAM_ATTENDANCE_CREATE                       : "Exam Attendance Create",
    EXAM_ATTENDANCE_UPDATE                       : "Exam Attendance Update",
    EXAM_ATTENDANCE_DELETE                       : "Exam Attendance Delete",
    EXAM_ATTENDANCE_MARK                         : "Exam Attendance Mark",
    EXAM_ROOM_ATTENDANCE_STATUS_UPDATE           : "Exam Room Attendance Status Update",
    TEACHER_EXAM_ASSIGNMENT_CREATE               : "Teacher Exam Assignment Create",
    TEACHER_EXAM_ASSIGNMENT_DELETE               : "Teacher Exam Assignment Delete",
    RESULT_STUDENT_CREATE                        : "Result Student Create",

    // ─── Asset Category ─────────────────────────────────────────────────────
    ASSET_CATEGORY_CREATE                        : "Asset Category Create",
    ASSET_CATEGORY_UPDATE                        : "Asset Category Update",
    ASSET_CATEGORY_DELETE                        : "Asset Category Delete",

    // ─── Sub Account ────────────────────────────────────────────────────────
    SUB_ACCOUNT_CREATE                           : "Sub Account Create",
    SUB_ACCOUNT_UPDATE                           : "Sub Account Update",
    SUB_ACCOUNT_DELETE                           : "Sub Account Delete",
});

export const AUDIT_LOG_ACTIONS = Object.freeze([
    "CREATE",
    "UPDATE",
    "DELETE",
    "ASSIGN",
    "VERIFY",
]);

export const AUDIT_LOG_STATUSES = Object.freeze([
    "SUCCESS",
    "WARNING",
    "FAILED",
]);

export const AUDIT_DATE_RANGES = Object.freeze([
    { label: "All Time", value: "ALL" },
    { label: "Today", value: "TODAY" },
    { label: "Yesterday", value: "YESTERDAY" },
    { label: "Last 7 Days", value: "WEEK" },
    { label: "Last 30 Days", value: "MONTH" },
]);
