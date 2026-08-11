/**
 * AUDIT_ACTIONS — Database-level operation identifiers for event_log.action.
 *
 * These values MUST match the ENUM defined in the event_log migration:
 *   ENUM('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE')
 *
 * These are distinct from AUDIT_EVENTS (business event names).
 * One business event may produce event_log rows with different AUDIT_ACTIONS.
 */
export const AUDIT_ACTIONS = Object.freeze({
    CREATE:       "CREATE",
    UPDATE:       "UPDATE",
    DELETE:       "DELETE",
    BULK_CREATE:  "BULK_CREATE",
    BULK_UPDATE:  "BULK_UPDATE",
    BULK_DELETE:  "BULK_DELETE",
});
