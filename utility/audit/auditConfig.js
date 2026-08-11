/**
 * Audit configuration.
 *
 * Centralises which models are excluded from auditing, which fields are globally
 * sensitive, and any per-model field exclusions discovered from actual model files.
 *
 * ─── HOW TO EXTEND ──────────────────────────────────────────────────────────
 * • To exclude a new model from all auditing:
 *     Add its Sequelize model.name (the first arg of sequelize.define()) to AUDIT_EXCLUDED_MODELS.
 *
 * • To globally redact a sensitive field name:
 *     Add it (lowercase) to GLOBALLY_SENSITIVE_FIELDS.
 *
 * • To exclude a heavy/sensitive field from a specific model only:
 *     Add an entry to MODEL_AUDIT_EXCLUDED_FIELDS keyed by the model's tableName.
 * ────────────────────────────────────────────────────────────────────────────
 */

// ─── A. Models excluded from all auditing ───────────────────────────────────
//
// Use the exact string passed as the first argument to sequelize.define().
// Confirmed from Phase 1 model files:
//   eventModel      → sequelize.define('event', ...)
//   eventLogModel   → sequelize.define('event_log', ...)
//
// MANDATORY: these two must always be excluded to prevent recursive audit loops.
//
export const AUDIT_EXCLUDED_MODELS = new Set([
    'event',
    'event_log',
]);

/**
 * Returns true when the given Sequelize model should never be audited.
 * Callers (hooks, helpers) should use this rather than reading the Set directly
 * so that the check logic can evolve without touching every call-site.
 *
 * @param {object} model - A Sequelize model class (has .name and .tableName).
 * @returns {boolean}
 */
export function isAuditModelExcluded(model) {
    if (!model) return true;
    return AUDIT_EXCLUDED_MODELS.has(model.name) ||
           AUDIT_EXCLUDED_MODELS.has(model.tableName);
}


// ─── B. Globally sensitive field names ──────────────────────────────────────
//
// These are stored lowercase for case-insensitive matching inside the sanitizer.
// Any field whose name, lowercased, is in this Set will be removed from audit data.
//
// Fields intentionally NOT excluded:
//   createdAt, updatedAt, createdBy, updatedBy — these carry valuable audit context.
//
// deletedAt is excluded: soft-delete timestamps leak information about record
// lifecycle that is already modelled by AUDIT_ACTIONS (DELETE).
//
export const GLOBALLY_SENSITIVE_FIELDS = new Set([
    // Authentication credentials
    'password',
    'passwordhash',
    'hashedpassword',
    'dummypassword',       // userModel.dummyPassword — stores plain-text fallback

    // Tokens / secrets
    'accesstoken',
    'refreshtoken',
    'token',
    'otp',
    'secret',
    'apikey',
    'authorization',

    // Infrastructure fields not useful in audit diffs
    'deletedat',
]);

/**
 * Returns true when the given field name is globally sensitive and should be
 * redacted from all audit records regardless of model.
 *
 * Matching is case-insensitive.
 *
 * @param {string} fieldName
 * @returns {boolean}
 */
export function isSensitiveAuditField(fieldName) {
    if (typeof fieldName !== 'string') return false;
    return GLOBALLY_SENSITIVE_FIELDS.has(fieldName.toLowerCase());
}


// ─── C. Model-specific excluded fields ──────────────────────────────────────
//
// Keyed by Sequelize tableName (the `tableName` option in sequelize.define()).
// Values are arrays of camelCase JS attribute names as they appear in model rawAttributes.
//
// Discoveries from model inspection:
//
// student_hall_ticket (studentHallTicketModel.js):
//   • `qr`  — DataTypes.TEXT — stores the full QR code content string for the
//     student's hall ticket. This is a large opaque payload (base64 or SVG string)
//     that has no audit-diff value and would bloat every event_log row.
//     EXCLUDED.
//
// question_paper (questionPaperModel.js):
//   • `questionPaper` — DataTypes.JSON — stores the entire question paper document
//     as a JSON blob (questions, answers, marks breakdown). This can be arbitrarily
//     large and is itself a content record, not a metadata field.
//     EXCLUDED from automatic generic auditing. When question paper approval events
//     are explicitly audited (QUESTION_PAPER_APPROVE) the service layer can decide
//     to include a summary instead.
//
// users (userModel.js):
//   • `password`       — covered by GLOBALLY_SENSITIVE_FIELDS.
//   • `dummyPassword`  — covered by GLOBALLY_SENSITIVE_FIELDS.
//   No additional model-specific exclusions needed.
//
export const MODEL_AUDIT_EXCLUDED_FIELDS = Object.freeze({
    student_hall_ticket: [
        'qr',                      // large QR payload — TEXT field, not useful in diffs
    ],

    question_paper: [
        'questionPaper',           // full JSON exam content blob — too large and opaque
    ],
});

/**
 * Returns the array of model-specific field names to exclude for the given tableName,
 * or an empty array if none are configured.
 *
 * @param {string} tableName - The Sequelize model tableName.
 * @returns {string[]}
 */
export function getModelAuditExcludedFields(tableName) {
    return MODEL_AUDIT_EXCLUDED_FIELDS[tableName] ?? [];
}
