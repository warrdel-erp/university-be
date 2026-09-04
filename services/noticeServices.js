import * as notice from "../repository/noticeRepository.js";

export async function addNotice(data, createdBy, updatedBy) {
  try {
    const payload = {
      ...data,
      createdBy,
      updatedBy,
    };
    return notice.addNotice(payload);
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
  return notice.updateNotice(noticeId, { ...data, updatedBy });
}

export async function deleteNotice(noticeId) {
  return notice.deleteNotice(noticeId);
}
