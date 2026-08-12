// Models excluded from auditing to prevent recursive loops
export const AUDIT_EXCLUDED_MODELS = new Set([
    'event',
    'event_log',
]);

export function isAuditModelExcluded(model) {
    if (!model) return true;
    return AUDIT_EXCLUDED_MODELS.has(model.name) ||
           AUDIT_EXCLUDED_MODELS.has(model.tableName);
}

// Globally sensitive fields that will be redacted from all logs
export const GLOBALLY_SENSITIVE_FIELDS = new Set([
    'password',
    'passwordhash',
    'hashedpassword',
    'dummypassword',
    'accesstoken',
    'refreshtoken',
    'token',
    'otp',
    'secret',
    'apikey',
    'authorization',
    'deletedat',
]);

export function isSensitiveAuditField(fieldName) {
    if (typeof fieldName !== 'string') return false;
    return GLOBALLY_SENSITIVE_FIELDS.has(fieldName.toLowerCase());
}

// Model-specific fields to exclude from logs (e.g., large payloads)
export const MODEL_AUDIT_EXCLUDED_FIELDS = Object.freeze({
    student_hall_ticket: [
        'qr',
    ],
    question_paper: [
        'questionPaper',
    ],
});

export function getModelAuditExcludedFields(tableName) {
    return MODEL_AUDIT_EXCLUDED_FIELDS[tableName] ?? [];
}
