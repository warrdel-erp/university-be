/**
 * Event Repository
 *
 * Database-only functions for the `event` table (audit parent record).
 * No business logic — only CRUD against the eventModel.
 *
 * The `event` table is NOT tenant-scoped (scopeConfig = all false),
 * so we use the model directly instead of scoped(model).
 */

import * as model from '../models/index.js';

// Maximum characters we allow to store in error_message.
// Matching Phase 2 MAX_AUDIT_STRING_LENGTH for consistency.
const MAX_ERROR_MESSAGE_LENGTH = 5_000;

/**
 * Creates a new parent event record with status PENDING.
 *
 * @param {object} data
 * @param {string} data.eventId       - UUID (caller-generated).
 * @param {string} data.eventType     - One of AUDIT_EVENTS values.
 * @param {number|null} data.userId
 * @param {number|null} data.universityId
 * @param {number|null} data.instituteId
 * @param {number|null} data.academicYearId
 * @returns {Promise<object>} The created event plain object.
 */
export async function createEvent({
    eventId,
    eventType,
    userId        = null,
    universityId  = null,
    instituteId   = null,
    academicYearId = null,
}) {
    const record = await model.eventModel.create({
        eventId,
        eventType,
        status: 'PENDING',
        userId,
        universityId,
        instituteId,
        academicYearId,
    });
    return record.get({ plain: true });
}

/**
 * Marks a parent event as SUCCESS.
 * Called after the business transaction commits.
 *
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function markEventSuccess(eventId) {
    await model.eventModel.update(
        {
            status:      'SUCCESS',
            completedAt: new Date(),
        },
        { where: { eventId } }
    );
}

/**
 * Marks a parent event as FAILED.
 * Called after the business transaction rolls back.
 *
 * errorMessage is safely truncated and must never contain stack traces,
 * SQL, passwords, tokens, or request body content.
 *
 * @param {string} eventId
 * @param {string|null} [errorMessage]
 * @returns {Promise<void>}
 */
export async function markEventFailed(eventId, errorMessage = null) {
    let safeMessage = null;
    if (errorMessage != null) {
        safeMessage = String(errorMessage).slice(0, MAX_ERROR_MESSAGE_LENGTH) || null;
    }

    await model.eventModel.update(
        {
            status:       'FAILED',
            completedAt:  new Date(),
            errorMessage: safeMessage,
        },
        { where: { eventId } }
    );
}
