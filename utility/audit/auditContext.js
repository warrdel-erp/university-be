import { requestContext } from "../requestContext.js";

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
      Promise.resolve().then(fn).then(resolve).catch(reject);
    });
  });
}
