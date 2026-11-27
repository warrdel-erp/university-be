import * as lectureWindowRepository from "../repository/lectureWindowRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

function assertValidDateRange(startDate, endDate) {
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("startDate cannot be after endDate");
  }
}

export async function addLectureWindow(data, createdBy, updatedBy) {
  assertValidDateRange(data.startDate, data.endDate);

  return await withAuditEvent(AUDIT_EVENTS.LECTURE_WINDOW_CREATE, async ({ transaction }) => {
    const lectureWindow = await lectureWindowRepository.addLectureWindow(
      {
        ...data,
        createdBy,
        updatedBy,
      },
      { transaction },
    );

    return lectureWindowRepository.getLectureWindowById(lectureWindow.lectureWindowId, data.academicYearId);
  });
}

export async function getLectureWindows(filters) {
  return lectureWindowRepository.getLectureWindows(filters);
}

export async function getLectureWindowById(lectureWindowId, academicYearId, userId) {
  return lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId, userId);
}

export async function updateLectureWindow(lectureWindowId, data, updatedBy, academicYearId, userId) {
  if (data.startDate && data.endDate) {
    assertValidDateRange(data.startDate, data.endDate);
  }

  const payload = {
    ...data,
    updatedBy,
  };
  delete payload.lessonIds;
  delete payload.academicYearId;

  return await withAuditEvent(AUDIT_EVENTS.LECTURE_WINDOW_UPDATE, async ({ transaction }) => {
    const updated = await lectureWindowRepository.updateLectureWindow(
      lectureWindowId,
      payload,
      academicYearId,
      userId,
      { transaction },
    );
    if (!updated) {
      return null;
    }

    if (Array.isArray(data.lessonIds) && data.lessonIds.length) {
      await lectureWindowRepository.linkLessonsToWindow(lectureWindowId, data.lessonIds, updatedBy, { transaction });
    }

    return lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId, userId);
  });
}

export async function deleteLectureWindow(lectureWindowId, academicYearId, userId) {
  const window = await lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId, userId);
  if (!window) {
    return false;
  }

  if ((window.lessons || []).length > 0) {
    throw new Error("Cannot delete lecture window while lessons are present");
  }

  return await withAuditEvent(AUDIT_EVENTS.LECTURE_WINDOW_DELETE, async ({ transaction }) => {
    return await lectureWindowRepository.deleteLectureWindow(lectureWindowId, academicYearId, userId, { transaction });
  });
}
