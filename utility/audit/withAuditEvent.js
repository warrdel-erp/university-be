/**
 * withAuditEvent — Centralized business-event audit wrapper.
 *
 * Wraps one business operation in a parent `event` lifecycle:
 *
 *   1. Validates arguments early.
 *   2. Detects and rejects nested calls (V1 limitation).
 *   3. Reads current request context (tenant + user fields).
 *   4. Generates a UUID eventId using Node's built-in crypto.randomUUID().
 *   5. Creates the parent event record with status = PENDING
 *      (OUTSIDE the business transaction so FAILED state survives rollbacks).
 *   6. Extends the AsyncLocalStorage store with audit.eventId + audit.eventType
 *      while preserving all existing tenant fields (userId, universityId, etc.).
 *   7. Runs the business callback inside a Sequelize callback-style transaction.
 *   8. On commit → marks event SUCCESS.
 *   9. On failure → rolls back, marks event FAILED, re-throws original error.
 *  10. Returns the callback's return value unchanged.
 *
 * ─── IMPORTANT: No transaction in AsyncLocalStorage ──────────────────────────
 * The Sequelize transaction is NOT stored in the context store.
 * It is passed directly to the callback as { transaction }.
 * Repositories receive it through their existing options argument.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ─── V1 Limitation: No nested audit events ───────────────────────────────────
 * If withAuditEvent() is called while already inside another withAuditEvent()
 * (detected via audit.eventId in the current store), an error is thrown.
 * This prevents accidental creation of independent orphaned parent events.
 * Nested audit support requires Phase N architectural additions.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   const result = await withAuditEvent(
 *     AUDIT_EVENTS.STUDENT_CREATE,
 *     async ({ transaction }) => {
 *       return studentRepository.createStudent(data, { transaction });
 *     }
 *   );
 */

import { randomUUID } from 'node:crypto';

import sequelize from '../../database/sequelizeConfig.js';
import { AUDIT_EVENTS } from '../../const/auditEvents.js';
import { requestContext } from '../requestContext.js';
import { runWithAuditContext, getCurrentEventId } from './auditContext.js';
import {
    createEvent,
    markEventSuccess,
    markEventFailed,
} from '../../repository/eventRepository.js';

// ─── Valid event types set (built once at module load) ────────────────────────
// Used for fast O(1) validation without duplicating the AUDIT_EVENTS values.
const VALID_EVENT_TYPES = new Set(Object.values(AUDIT_EVENTS));

/**
 * Maximum characters stored as errorMessage on a FAILED event.
 * Defensive cap — keeps the column lean and prevents SQL/stack-trace leakage.
 */
const MAX_ERROR_MESSAGE_LENGTH = 5_000;

/**
 * Safely extracts a short, non-sensitive message from any thrown value.
 * Never stores: stack traces, SQL, connection strings, headers, tokens.
 *
 * @param {unknown} error
 * @returns {string|null}
 */
function safeErrorMessage(error) {
    if (error == null) return null;
    const msg = typeof error === 'object' && error.message
        ? String(error.message)
        : String(error);
    return msg.slice(0, MAX_ERROR_MESSAGE_LENGTH) || null;
}


/**
 * Audit event wrapper.
 *
 * @param {string}   eventType - Must be a value from AUDIT_EVENTS.
 * @param {Function} callback  - Async function receiving ({ transaction }).
 *                               Its return value is forwarded to the caller.
 * @returns {Promise<*>} Whatever the callback returns.
 * @throws  {Error} Re-throws the original callback error after marking FAILED.
 */
export async function withAuditEvent(eventType, callback) {
    // ── 1. Argument validation ─────────────────────────────────────────────
    if (!eventType || typeof eventType !== 'string') {
        throw new Error(
            '[withAuditEvent] eventType is required and must be a string.'
        );
    }
    if (!VALID_EVENT_TYPES.has(eventType)) {
        throw new Error(
            `[withAuditEvent] Unknown eventType: "${eventType}". ` +
            `Add it to const/auditEvents.js before using it.`
        );
    }
    if (typeof callback !== 'function') {
        throw new Error(
            '[withAuditEvent] callback must be an async function.'
        );
    }

    // ── 2. Nested call guard (V1) ──────────────────────────────────────────
    if (getCurrentEventId() != null) {
        throw new Error(
            '[withAuditEvent] Nested withAuditEvent() calls are not supported in ' +
            'audit V1. Ensure each business operation creates its own top-level ' +
            'audit event rather than nesting them.'
        );
    }

    // ── 3. Read current tenant context ────────────────────────────────────
    const store = requestContext.getStore() ?? {};

    // Use canonical fields, not defaultXxx aliases.
    const userId          = store.userId          ?? null;
    const universityId    = store.universityId    ?? null;
    const instituteId     = store.instituteId     ?? null;
    const academicYearId  = store.academicYearId  ?? null;

    // ── 4. Generate UUID ───────────────────────────────────────────────────
    const eventId = randomUUID();

    // ── 5. Create parent event = PENDING (OUTSIDE business transaction) ────
    // This record must survive even when the business transaction rolls back.
    // By creating it before and outside the transaction, a subsequent
    // markEventFailed() can update it even after rollback.
    await createEvent({
        eventId,
        eventType,
        userId,
        universityId,
        instituteId,
        academicYearId,
    });

    // ── 6 + 7 + 8 + 9: Run inside extended audit context ──────────────────
    let businessResult;

    try {
        businessResult = await runWithAuditContext(eventId, eventType, async () => {
            // sequelize.transaction() callback form:
            //   - auto-commits when the async function resolves.
            //   - auto-rolls-back when the async function throws.
            return await sequelize.transaction(async (transaction) => {
                return callback({ transaction });
            });
        });
    } catch (businessError) {
        // ── Failure path ───────────────────────────────────────────────────
        // Business transaction has already been rolled back by Sequelize.
        // Now mark the parent event FAILED.
        try {
            await markEventFailed(eventId, safeErrorMessage(businessError));
        } catch (auditError) {
            // markEventFailed() itself failed.
            // Log a safe infrastructure message — do NOT expose auditError details.
            // Do NOT replace the original business error.
            console.error(
                '[withAuditEvent] Failed to mark event as FAILED for eventId:',
                eventId,
                '— audit infrastructure error (details suppressed).'
            );
        }

        // Re-throw the ORIGINAL business error unchanged.
        throw businessError;
    }

    // ── 8. SUCCESS path: transaction committed successfully ────────────────
    // Mark SUCCESS in a separate, independent operation.
    // If this fails, the business data is already committed and correct —
    // we should NOT roll it back. Log the audit infrastructure failure only.
    try {
        await markEventSuccess(eventId);
    } catch (auditError) {
        // The business operation succeeded. Only the audit bookkeeping failed.
        // This leaves the event in PENDING state, which is detectable for repair.
        // Log a safe infrastructure message only.
        console.error(
            '[withAuditEvent] Business transaction committed but failed to mark ' +
            'event SUCCESS for eventId:',
            eventId,
            '— audit infrastructure error (details suppressed). Event remains PENDING.'
        );
        // Do NOT throw — the business operation was successful.
        // The caller should receive the correct business result.
    }

    return businessResult;
}
