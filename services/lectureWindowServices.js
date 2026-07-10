import * as lectureWindowRepository from "../repository/lectureWindowRepository.js";

function assertValidDateRange(startDate, endDate) {
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("startDate cannot be after endDate");
  }
}

export async function addLectureWindow(data, createdBy, updatedBy) {
  assertValidDateRange(data.startDate, data.endDate);

  const lectureWindow = await lectureWindowRepository.addLectureWindow({
    ...data,
    createdBy,
    updatedBy,
  });

  return lectureWindowRepository.getLectureWindowById(lectureWindow.lectureWindowId, data.academicYearId);
}

export async function getLectureWindows(filters) {
  return lectureWindowRepository.getLectureWindows(filters);
}

export async function getLectureWindowById(lectureWindowId, academicYearId) {
  return lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
}

export async function updateLectureWindow(lectureWindowId, data, updatedBy, academicYearId) {
  if (data.startDate && data.endDate) {
    assertValidDateRange(data.startDate, data.endDate);
  }

  const payload = {
    ...data,
    updatedBy,
  };
  delete payload.lessonIds;
  delete payload.academicYearId;

  const updated = await lectureWindowRepository.updateLectureWindow(lectureWindowId, payload, academicYearId);
  if (!updated) {
    return null;
  }

  if (Array.isArray(data.lessonIds) && data.lessonIds.length) {
    await lectureWindowRepository.linkLessonsToWindow(lectureWindowId, data.lessonIds, updatedBy);
  }

  return lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
}

export async function deleteLectureWindow(lectureWindowId, academicYearId) {
  const window = await lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
  if (!window) {
    return false;
  }

  if ((window.windowLessons || []).length > 0) {
    throw new Error("Cannot delete lecture window while lessons are present");
  }

  return lectureWindowRepository.deleteLectureWindow(lectureWindowId, academicYearId);
}

export async function linkLessonsToWindow(lectureWindowId, lessonIds, updatedBy, academicYearId) {
  const window = await lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
  if (!window) {
    throw new Error("Lecture window not found");
  }

  return lectureWindowRepository.linkLessonsToWindow(lectureWindowId, lessonIds, updatedBy);
}
