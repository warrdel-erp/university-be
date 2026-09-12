import {
  isSensitiveAuditField,
  getModelAuditExcludedFields,
} from "./auditConfig.js";

export const MAX_AUDIT_STRING_LENGTH = 5_000;
export const MAX_AUDIT_ARRAY_ITEMS = 50;

export const AUDIT_VALUE_OMITTED = "[AUDIT_VALUE_OMITTED]";
export const AUDIT_VALUE_TOO_LARGE = "[AUDIT_VALUE_TOO_LARGE]";

// Sequelize auto-timestamps — noisy in diffs; event_log.created_at already records when the change was audited.
const AUDIT_NOISE_FIELDS = new Set([
  "createdat",
  "updatedat",
]);

function isAuditNoiseField(fieldName) {
  if (typeof fieldName !== "string") return false;
  return AUDIT_NOISE_FIELDS.has(fieldName.toLowerCase());
}

function toAuditDateString(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (
    value != null &&
    typeof value === "object" &&
    typeof value.toISOString === "function"
  ) {
    try {
      return value.toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function sanitizeValue(value, _visited = new WeakSet()) {
  if (value === null || value === undefined) return null;
  const type = typeof value;

  if (type !== "object" && type !== "bigint") {
    if (type === "function" || type === "symbol") return AUDIT_VALUE_OMITTED;
    return value;
  }
  if (type === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return AUDIT_VALUE_OMITTED;

  const asDate = toAuditDateString(value);
  if (asDate != null) return asDate;

  if (Array.isArray(value)) {
    if (value.length > MAX_AUDIT_ARRAY_ITEMS) return AUDIT_VALUE_TOO_LARGE;
    if (_visited.has(value)) return AUDIT_VALUE_OMITTED;
    _visited.add(value);
    return value.map((item) => sanitizeValue(item, _visited));
  }

  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) {
    if (_visited.has(value)) return AUDIT_VALUE_OMITTED;
    _visited.add(value);
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSensitiveAuditField(key)) continue;
      if (isAuditNoiseField(key)) continue;
      result[key] = sanitizeValue(val, _visited);
    }
    return result;
  }

  return AUDIT_VALUE_OMITTED;
}

export { getModelAuditExcludedFields };

// Converts Sequelize instance or value to a plain JS object
export function getAuditableData(instance) {
  if (instance && typeof instance.get === "function") {
    try {
      return instance.get({ plain: true });
    } catch {}
  }
  return instance;
}

function isEmptyAuditPayload(data) {
  if (data == null) return true;
  if (typeof data !== "object" || Array.isArray(data)) return false;
  return Object.keys(data).length === 0;
}

// Sanitizes data for event_log JSON columns
export function sanitizeAuditData(data, options = {}) {
  if (data === null || data === undefined) return null;

  const plain = getAuditableData(data);
  if (plain === null || plain === undefined) return null;

  if (typeof plain !== "object" || Array.isArray(plain)) {
    if (Array.isArray(plain)) {
      const sanitized = sanitizeValue(plain);
      return sanitized === AUDIT_VALUE_TOO_LARGE ? null : sanitized;
    }
    return null;
  }

  const { tableName } = options;
  const modelExcluded = tableName
    ? new Set(getModelAuditExcludedFields(tableName))
    : new Set();

  const visited = new WeakSet();
  visited.add(plain);

  const result = {};

  for (const [key, value] of Object.entries(plain)) {
    if (isSensitiveAuditField(key)) continue;
    if (isAuditNoiseField(key)) continue;
    if (modelExcluded.has(key)) continue;

    const sanitized = sanitizeValue(value, visited);

    if (
      typeof sanitized === "string" &&
      sanitized.length > MAX_AUDIT_STRING_LENGTH
    ) {
      result[key] = AUDIT_VALUE_TOO_LARGE;
      continue;
    }

    result[key] = sanitized;
  }

  return isEmptyAuditPayload(result) ? null : result;
}

// Builds { oldData, newData } diff for a modified Sequelize instance
export function buildAuditUpdateDiff(instance, options = {}) {
  const emptyDiff = { oldData: null, newData: null };

  if (!instance || typeof instance.changed !== "function") {
    return emptyDiff;
  }

  const changedFields = instance.changed();
  if (!changedFields || changedFields.length === 0) {
    return emptyDiff;
  }

  const rawOld = {};
  const rawNew = {};

  for (const field of changedFields) {
    if (isAuditNoiseField(field)) continue;
    rawOld[field] = instance.previous(field);
    rawNew[field] = instance.get(field);
  }

  if (Object.keys(rawOld).length === 0) {
    return emptyDiff;
  }

  return {
    oldData: sanitizeAuditData(rawOld, options),
    newData: sanitizeAuditData(rawNew, options),
  };
}
