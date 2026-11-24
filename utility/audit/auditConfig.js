// Models excluded from auditing to prevent recursive loops
export const AUDIT_EXCLUDED_MODELS = new Set([
  "event",
  "event_log",
  "previous_academic_upload_log",
]);

/**
 * Gradual rollout allowlist (tableName values).
 * Set AUDIT_ALL_MODELS = true when ready to audit every non-excluded model.
 */
export const AUDIT_ALL_MODELS = false;

export const AUDIT_ENABLED_TABLES = new Set([
  "exam_schedule",
  "examination_session",
  "campus",
  "institute",
  "affiliated_university",
  "course",
  "employee_code_master",
  "employee_code_master_type",
  "department",
  "department_positions",
  "user_department_positions",
  "governance_body",
  "curriculum",
  "curriculum_subject_term_mapping",
  "curriculum_batch_mapping",
  "curriculum_category",
  "subject_component",
  "subject_component_mapping",
  "elective_pool",
  "elective_pool_subject_mapping",
  "subject",
  "class_sections",
  "class_section_term",
  "academic_group_scope",
  "academic_group",
  "academic_group_user",
  "academic_group_student",
  "teacher_subject_mapping",
  "teacher_section_mapping",
  "time_table_routine",
  "time_table_cell",
  "time_table_cell_date_wise",
  "time_table_cell_teachers",
  "time_table_cell_teachers_date_wise",
  "time_table_structure_course",
  "attendance",
  "holiday",
  "schedule",
  "schedule_assign",
  "teacher_attendence",
  "lecture_window",
  "lesson",
  "topic",
  "sub_topic",
  "lesson_mapping",
  "fee_type_catalog",
  "fee_type_category",
  "fee_policy",
  "fee_policy_components",
  "fee_policy_batches",
  "fee_policy_slabs",
  "fee_policy_students",
  "fee_plan_item",
  "fee_plan_sub_items",
  "fee_plan_publish_history",
  "billing_schedule_items",
  "billing_schedule_sub_items",
  "billing_schedule_payment_terms",
  "student_fee_invoice",
  "student_fee_invoice_items",
  "student_fee_payment",
  "payment_item",
  "exam_setup_type",
  "grading",
  "grading_grade",
  "academic_regulation",
  "academic_regulation_classification",
  "academic_regulation_course_mapping",
  "assessment_plan",
  "assessment_plan_component",
  "assessment_plan_subject_mapping",
  "internal_assessment",
  "internal_assessment_student_evaluation",
  "assessment_evalution",
  "assessment_evaluation",
  "examination_session_term",
  "examination_session_slot",
  "evalutions",
  "evaluation",
  "evalution",
  "exam_invigilator_assignment",
  "student_result",
  "student_result_item",
  "subject_zscore_calculation",
  "exam_room_material_bundle",
  "exam_room_material_item",
  "exam_schedule_room_capacity",
  "student_exam_seat",
  "exam_attendance",
  "class_room_section",
  "answer_sheet_qr",
  "answersheet_evalution_user_assignment",
  "answer_sheet_annotation",
  "question_paper",
  "question_bank",
  "questionBank",
  "question_paper_blueprint",
  "questionPaperBlueprint",
  "employee",
  "teacher_substitute",
  "faculity_load",
  "leave_policies",
  "leave_policy_entitlements",
  "leave_policy_roles",
  "leave_policy_employees",
  "leave_types",
  "leave_requests",
  "approval_requests",
  "leave_balance",
  "students",
  "student_cor_address",
  "student_elective_subject",
  "student_class_sections_history",
  "students_address",
  "students_entrance_detail",
  "subject_mapper",
  "library_creation",
  "library_floor",
  "library_aisle",
  "library_rack",
  "library_row",
  "library_category",
  "library_book",
  "library_book_inventory",
  "library_issue_book_transaction",
  "library_book_issue_inventory_item",
  "library_return_book_transaction",
  "library_book_category_mappings",
  "library_book_subject_mappings",
]);

export function isAuditModelExcluded(model) {
  if (!model) return true;
  return (
    AUDIT_EXCLUDED_MODELS.has(model.name) ||
    AUDIT_EXCLUDED_MODELS.has(model.tableName)
  );
}

export function isModelAuditEnabled(model) {
  if (!model?.tableName || isAuditModelExcluded(model)) return false;
  if (AUDIT_ALL_MODELS) return true;
  return AUDIT_ENABLED_TABLES.has(model.tableName);
}

// Globally sensitive fields that will be redacted from all logs
export const GLOBALLY_SENSITIVE_FIELDS = new Set([
  "password",
  "passwordhash",
  "hashedpassword",
  "dummypassword",
  "accesstoken",
  "refreshtoken",
  "token",
  "otp",
  "secret",
  "apikey",
  "authorization",
  "deletedat",
]);

export function isSensitiveAuditField(fieldName) {
  if (typeof fieldName !== "string") return false;
  return GLOBALLY_SENSITIVE_FIELDS.has(fieldName.toLowerCase());
}

// Model-specific fields to exclude from logs (e.g., large payloads)
export const MODEL_AUDIT_EXCLUDED_FIELDS = Object.freeze({
  student_hall_ticket: ["qr"],
  question_paper: ["questionPaper"],
});

export function getModelAuditExcludedFields(tableName) {
  return MODEL_AUDIT_EXCLUDED_FIELDS[tableName] ?? [];
}
