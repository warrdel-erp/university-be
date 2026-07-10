import * as lectureWindowRepository from "../repository/lectureWindowRepository.js";
import * as lessonRepository from "../repository/lessonRepository.js";
import sequelize from "../database/sequelizeConfig.js";

function assertValidDateRange(startDate, endDate) {
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("startDate cannot be after endDate");
  }
}

export async function addLectureWindow(data, createdBy, updatedBy) {
  assertValidDateRange(data.startDate, data.endDate);

  const transaction = await sequelize.transaction();

  try {
    const lectureWindow = await lectureWindowRepository.addLectureWindow({
      ...data,
      createdBy,
      updatedBy,
    }, transaction);

    if (Array.isArray(data.lessons) && data.lessons.length) {
      for (const lessonItem of data.lessons) {
        await lessonRepository.addLesson({
          ...lessonItem,
          lectureWindowId: lectureWindow.lectureWindowId,
          subjectId: data.subjectId,
          employeeId: data.employeeId,
          academicYearId: data.academicYearId,
          sessionId: data.sessionId,
          createdBy,
          updatedBy,
        }, transaction);
      }
    }

    await transaction.commit();
    return lectureWindowRepository.getLectureWindowById(lectureWindow.lectureWindowId, data.academicYearId);
  } catch (error) {
    await transaction.rollback();
    console.error("Error in addLectureWindow:", error);
    throw error;
  }
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
  delete payload.lessons;
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
