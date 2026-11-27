import * as notice from "../repository/noticeRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addNotice(data, createdBy, updatedBy) {
  try {
    const payload = {
      ...data,
      createdBy,
      updatedBy,
    };
    return await withAuditEvent(AUDIT_EVENTS.NOTICE_CREATE, async ({ transaction }) => {
      return notice.addNotice(payload, { transaction });
    });
  } catch (error) {
    console.error("Transaction failed in add notice:", error);
    throw error;
  }
}

export async function getAllStudentNotice(academicYearId) {
  return notice.getAllNotices(academicYearId);
}

export async function getAllEmployeeNotice(academicYearId) {
  return notice.getAllNotices(academicYearId);
}

export async function updateNotice(noticeId, data, updatedBy) {
  return await withAuditEvent(AUDIT_EVENTS.NOTICE_UPDATE, async ({ transaction }) => {
    return notice.updateNotice(noticeId, { ...data, updatedBy }, { transaction });
  });
}

export async function deleteNotice(noticeId) {
  return await withAuditEvent(AUDIT_EVENTS.NOTICE_DELETE, async ({ transaction }) => {
    return notice.deleteNotice(noticeId, { transaction });
  });
}
