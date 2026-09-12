import { requestContext } from "../requestContext.js";
import { createEvent } from "../../repository/eventRepository.js";

export function getAuditContext() {
  const store = requestContext.getStore();
  return store?.audit ?? null;
}

export function getCurrentEventId() {
  return getAuditContext()?.eventId ?? null;
}

export function getCurrentEventType() {
  return getAuditContext()?.eventType ?? null;
}

export function runWithAuditContext(eventId, eventType, fn) {
  const currentStore = requestContext.getStore() ?? {};

  const auditStore = {
    ...currentStore,
    audit: {
      ...(currentStore.audit ?? {}),
      eventId,
      eventType,
    },
  };

  return new Promise((resolve, reject) => {
    requestContext.run(auditStore, () => {
      Promise.resolve().then(fn).then(resolve).catch(reject);
    });
  });
}

/**
 * Ensures a parent event row exists for table-level audit logs.
 * Reuses the same eventId for all audited writes within one request.
 * event_type is the table name (not an API/business event).
 */
export async function ensureAuditEventId(tableName, transaction) {
  const existing = getCurrentEventId();
  if (existing != null) return existing;

  const store = requestContext.getStore();

  const event = await createEvent(
    {
      eventType: tableName,
      status: "SUCCESS",
      userId: store?.userId ?? null,
      universityId: store?.universityId ?? null,
      instituteId: store?.instituteId ?? null,
      academicYearId: store?.academicYearId ?? null,
    },
    { transaction },
  );

  const eventId = event.eventId;

  if (store) {
    store.audit = {
      ...(store.audit ?? {}),
      eventId,
      eventType: tableName,
    };
  }

  return eventId;
}
