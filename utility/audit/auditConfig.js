// Models excluded from auditing to prevent recursive loops
export const AUDIT_EXCLUDED_MODELS = new Set([
  "event",
  "event_log",
]);

/**
 * Gradual rollout allowlist (tableName values).
 * Set AUDIT_ALL_MODELS = true when ready to audit every non-excluded model.
 */
export const AUDIT_ALL_MODELS = false;

export const AUDIT_ENABLED_TABLES = new Set([
  "exam_schedule",
  "examination_session",
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
