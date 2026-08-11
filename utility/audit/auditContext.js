/**
 * Audit Context Helpers
 *
 * Thin helpers that read and write the `audit` sub-key inside the existing
 * request context (AsyncLocalStorage store managed by requestContext.js).
 *
 * ─── IMPORTANT ───────────────────────────────────────────────────────────────
 * There is only ONE AsyncLocalStorage instance in this application:
 *   `requestContext` from utility/requestContext.js
 *
 * These helpers do NOT create a second instance.
 * They read/write a nested `audit` key within the same store object.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The store shape inside a withAuditEvent() callback becomes:
 * {
 *   // ── Existing tenant fields (unchanged) ──
 *   userId, universityId, instituteId, defaultInstituteId,
 *   academicYearId, defaultAcademicYearId, defaultRole,
 *   campusId, bypass, permissionScope, accessFilter,
 *
 *   // ── Audit sub-key (added by withAuditEvent) ──
 *   audit: {
 *     eventId,    // UUID string
 *     eventType,  // One of AUDIT_EVENTS values
 *   }
 * }
 */

import { requestContext } from '../requestContext.js';

/**
 * Returns the `audit` sub-object from the current AsyncLocalStorage store,
 * or null if there is no active store or no audit context has been established.
 *
 * @returns {{ eventId: string, eventType: string } | null}
 */
export function getAuditContext() {
    const store = requestContext.getStore();
    return store?.audit ?? null;
}

/**
 * Returns the current audit eventId, or null if not inside withAuditEvent().
 *
 * @returns {string | null}
 */
export function getCurrentEventId() {
    return getAuditContext()?.eventId ?? null;
}

/**
 * Returns the current audit eventType, or null if not inside withAuditEvent().
 *
 * @returns {string | null}
 */
export function getCurrentEventType() {
    return getAuditContext()?.eventType ?? null;
}

/**
 * Runs `fn` inside the same AsyncLocalStorage context as the current request,
 * but with the `audit` sub-key merged in.
 *
 * This preserves ALL existing tenant fields (userId, universityId, etc.) so
 * scoped(model) continues working exactly as before inside `fn`.
 *
 * @param {string}   eventId    - UUID for the parent event.
 * @param {string}   eventType  - Business event type string.
 * @param {Function} fn         - Async function to execute inside the context.
 * @returns {Promise<*>} Resolves/rejects with whatever `fn` returns/throws.
 */
export function runWithAuditContext(eventId, eventType, fn) {
    const currentStore = requestContext.getStore() ?? {};

    const auditStore = {
        // Spread all existing tenant context fields unchanged
        ...currentStore,

        // Merge/overwrite the audit sub-key
        audit: {
            ...(currentStore.audit ?? {}),
            eventId,
            eventType,
        },
    };

    return new Promise((resolve, reject) => {
        requestContext.run(auditStore, () => {
            Promise.resolve()
                .then(fn)
                .then(resolve)
                .catch(reject);
        });
    });
}
