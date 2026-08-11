/**
 * Audit Sanitizer
 *
 * Provides pure, side-effect-free helpers to prepare data for storage
 * in event_log.old_data / event_log.new_data (MySQL JSON columns).
 *
 * Rules:
 *  - Never mutates the input.
 *  - Never logs raw payload contents.
 *  - Always returns a plain, JSON-serialisable object or null.
 *  - Removes globally sensitive fields and model-specific excluded fields.
 *  - Recursively sanitizes nested plain objects and arrays.
 *  - Replaces oversized strings, Buffers, and large arrays with safe markers.
 *  - Converts BigInt to string to avoid JSON.stringify errors.
 *  - Converts Date to ISO-8601 string for consistent serialisation.
 *  - Strips functions, symbols, and Sequelize-internal objects.
 */

import {
    isSensitiveAuditField,
    getModelAuditExcludedFields,
} from './auditConfig.js';

// ─── Size limits ─────────────────────────────────────────────────────────────

/**
 * Maximum length of a string value stored in an audit record.
 * Strings longer than this are replaced with AUDIT_VALUE_TOO_LARGE.
 *
 * Rationale: MySQL JSON columns can hold up to 1 GB but individual event_log rows
 * should stay lightweight. 5 000 characters covers almost all human-readable fields
 * while excluding QR payloads, large base64 blobs, and full JSON documents.
 */
export const MAX_AUDIT_STRING_LENGTH = 5_000;

/**
 * Maximum number of array elements stored in an audit record.
 * Arrays with more elements are replaced with AUDIT_VALUE_TOO_LARGE.
 *
 * Rationale: Bulk operations can produce arrays of hundreds of rows.
 * Storing them verbatim would make event_log rows unmanageably large.
 * Future phases can decide to summarise bulk arrays differently.
 */
export const MAX_AUDIT_ARRAY_ITEMS = 50;

// ─── Replacement markers ─────────────────────────────────────────────────────

/** Written when a value type cannot be safely serialised (Buffer, function, etc.). */
export const AUDIT_VALUE_OMITTED      = '[AUDIT_VALUE_OMITTED]';

/** Written when a value exceeds MAX_AUDIT_STRING_LENGTH or MAX_AUDIT_ARRAY_ITEMS. */
export const AUDIT_VALUE_TOO_LARGE    = '[AUDIT_VALUE_TOO_LARGE]';


// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * True for values that should be treated as plain objects eligible for
 * recursive sanitisation. Excludes Date, Buffer, and Sequelize-model instances.
 */
function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    if (value instanceof Date)   return false;
    if (Buffer.isBuffer(value))  return false;

    // Sequelize model instances expose .get() and have a ._modelOptions symbol.
    // We handle them separately in getAuditableData() before they reach here.
    // Reject anything whose prototype is not Object.prototype or null so that
    // internal class instances are not blindly traversed.
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Converts a single scalar value to a JSON-safe equivalent.
 * Returns AUDIT_VALUE_OMITTED for types that cannot be serialised.
 */
function toJsonSafeScalar(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'bigint')   return value.toString();
    if (typeof value === 'function') return AUDIT_VALUE_OMITTED;
    if (typeof value === 'symbol')   return AUDIT_VALUE_OMITTED;
    if (Buffer.isBuffer(value))      return AUDIT_VALUE_OMITTED;

    if (value instanceof Date) return value.toISOString();

    // Reject non-plain objects at the scalar level (handled recursively elsewhere)
    if (typeof value === 'object' && !isPlainObject(value) && !Array.isArray(value)) {
        return AUDIT_VALUE_OMITTED;
    }

    return value;
}


// ─── Core recursive sanitiser ────────────────────────────────────────────────

/**
 * Recursively sanitises a value for safe storage in a JSON audit column.
 *
 * Tracks visited objects via a WeakSet to abort on circular references
 * rather than crashing.
 *
 * @param {*}       value         - The value to sanitise.
 * @param {WeakSet} [_visited]    - Internal circular-reference guard.
 * @returns {*} A JSON-serialisable copy, or a marker string.
 */
function sanitizeValue(value, _visited = new WeakSet()) {
    // Primitives and null
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object' && typeof value !== 'bigint') {
        return toJsonSafeScalar(value);
    }

    // BigInt
    if (typeof value === 'bigint') return value.toString();

    // Buffer → omit
    if (Buffer.isBuffer(value)) return AUDIT_VALUE_OMITTED;

    // Date → ISO string
    if (value instanceof Date) return value.toISOString();

    // Arrays
    if (Array.isArray(value)) {
        if (value.length > MAX_AUDIT_ARRAY_ITEMS) return AUDIT_VALUE_TOO_LARGE;
        if (_visited.has(value)) return AUDIT_VALUE_OMITTED;
        _visited.add(value);
        return value.map(item => sanitizeValue(item, _visited));
    }

    // Plain objects — recursive
    if (isPlainObject(value)) {
        if (_visited.has(value)) return AUDIT_VALUE_OMITTED; // circular ref guard
        _visited.add(value);

        const result = {};
        for (const [key, val] of Object.entries(value)) {
            if (isSensitiveAuditField(key)) continue;          // drop sensitive keys
            result[key] = sanitizeValue(val, _visited);
        }
        return result;
    }

    // Fallback for non-plain class instances (Sequelize metadata, etc.)
    return AUDIT_VALUE_OMITTED;
}


// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the model-specific list of excluded field names for a given tableName.
 * Delegates to auditConfig — exposed here so callers only need this one import.
 *
 * @param {string} tableName
 * @returns {string[]}
 */
export { getModelAuditExcludedFields };

/**
 * Converts a Sequelize instance (or any value) to a plain JS object safe for auditing.
 *
 * For Sequelize instances: uses instance.get({ plain: true }) which returns own
 * data attributes without associations or internal metadata.
 *
 * For anything else: returned as-is for further processing by sanitizeAuditData().
 *
 * Does NOT mutate the input.
 *
 * @param {*} instance - A Sequelize model instance or any other value.
 * @returns {object|null}
 */
export function getAuditableData(instance) {
    if (instance === null || instance === undefined) return null;

    // Sequelize model instance: has .get() function and internal _modelOptions
    if (
        typeof instance === 'object' &&
        typeof instance.get === 'function' &&
        instance.constructor &&
        instance.constructor.name !== 'Object'
    ) {
        try {
            return instance.get({ plain: true });
        } catch {
            // If .get() fails for any reason, fall through to raw object handling
        }
    }

    return instance;
}

/**
 * Sanitizes data for safe storage in an audit JSON column.
 *
 * Removes:
 *  1. Globally sensitive fields (password, token, etc.)
 *  2. Model-specific excluded fields (configured in auditConfig.js)
 *
 * Also:
 *  - Converts Sequelize instances to plain objects first.
 *  - Replaces oversized strings with AUDIT_VALUE_TOO_LARGE.
 *  - Replaces Buffers with AUDIT_VALUE_OMITTED.
 *  - Converts BigInt to string.
 *  - Converts Date to ISO string.
 *  - Guards against circular references.
 *  - Does NOT mutate the input.
 *
 * @param {*}      data              - Input: plain object, Sequelize instance, null, or undefined.
 * @param {object} [options]
 * @param {string} [options.tableName] - Sequelize tableName, used to apply model-specific exclusions.
 * @returns {object|null} A sanitised plain object safe for JSON storage, or null.
 */
export function sanitizeAuditData(data, options = {}) {
    if (data === null || data === undefined) return null;

    // Resolve Sequelize instance to plain object
    const plain = getAuditableData(data);
    if (plain === null || plain === undefined) return null;

    // For non-object inputs (e.g. string, number) — wrap or return null
    if (typeof plain !== 'object' || Array.isArray(plain)) {
        // Top-level arrays are unusual in audit data but handle gracefully
        if (Array.isArray(plain)) {
            const sanitized = sanitizeValue(plain);
            return sanitized === AUDIT_VALUE_TOO_LARGE ? null : sanitized;
        }
        return null;
    }

    // Collect model-specific excluded fields for fast lookup
    const { tableName } = options;
    const modelExcluded = tableName
        ? new Set(getModelAuditExcludedFields(tableName))
        : new Set();

    const visited = new WeakSet();
    visited.add(plain);

    const result = {};

    for (const [key, value] of Object.entries(plain)) {
        // 1. Global sensitive field check (case-insensitive)
        if (isSensitiveAuditField(key)) continue;

        // 2. Model-specific exclusion (exact camelCase match from model rawAttributes)
        if (modelExcluded.has(key)) continue;

        // 3. Recursively sanitize the value
        const sanitized = sanitizeValue(value, visited);

        // 4. Handle oversized strings at the top-level key
        if (typeof sanitized === 'string' && sanitized.length > MAX_AUDIT_STRING_LENGTH) {
            result[key] = AUDIT_VALUE_TOO_LARGE;
            continue;
        }

        result[key] = sanitized;
    }

    return result;
}


// ─── UPDATE diff helper ───────────────────────────────────────────────────────

/**
 * Builds a minimal { oldData, newData } diff for a Sequelize instance
 * that is about to be (or has just been) updated.
 *
 * Uses:
 *   instance.changed()       → array of attribute names that changed
 *   instance.previous(field) → value before the change
 *   instance.get(field)      → current (new) value
 *
 * Runs both sides through sanitizeAuditData() so the result is always
 * ready for direct storage in event_log without further processing.
 *
 * Does NOT write to the database.
 * Does NOT mutate the instance.
 *
 * @param {object} instance  - A Sequelize model instance (must have .changed() available).
 * @param {object} [options]
 * @param {string} [options.tableName] - Passed to sanitizeAuditData for model-specific exclusions.
 * @returns {{ oldData: object|null, newData: object|null }}
 *   Returns { oldData: null, newData: null } when no fields changed or instance is invalid.
 */
export function buildAuditUpdateDiff(instance, options = {}) {
    const emptyDiff = { oldData: null, newData: null };

    if (!instance || typeof instance.changed !== 'function') {
        return emptyDiff;
    }

    const changedFields = instance.changed(); // string[] | false
    if (!changedFields || changedFields.length === 0) {
        return emptyDiff;
    }

    const rawOld = {};
    const rawNew = {};

    for (const field of changedFields) {
        rawOld[field] = instance.previous(field);
        rawNew[field] = instance.get(field);
    }

    return {
        oldData: sanitizeAuditData(rawOld, options),
        newData: sanitizeAuditData(rawNew, options),
    };
}
