import * as creditRepository from '../repository/creditRepository.js';
import { withAuditEvent } from '../utility/audit/withAuditEvent.js';
import { AUDIT_EVENTS } from '../const/auditEvents.js';

export async function addCredit(credits, createdBy, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.CREDIT_CREATE, async ({ transaction }) => {
    const creditData = credits.map((item) => ({
      ...item,
      createdBy,
      updatedBy,
    }));

    return await creditRepository.addCredit(creditData, { transaction });
  });
}

export async function getCreditDetails(courseId, sessionId) {
  return await creditRepository.getCreditDetails(courseId, sessionId);
}

export async function getSingleCreditDetails(creditId) {
  return await creditRepository.getSingleCreditDetails(creditId);
}

export async function deleteCredit(creditId) {
  return withAuditEvent(AUDIT_EVENTS.CREDIT_DELETE, async ({ transaction }) => {
    return await creditRepository.deleteCredit(creditId, { transaction });
  });
}

export async function updateCredit(creditId, creditData, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.CREDIT_UPDATE, async ({ transaction }) => {
    creditData.updatedBy = updatedBy;
    return await creditRepository.updateCredit(creditId, creditData, { transaction });
  });
}
