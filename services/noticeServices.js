import * as notice from "../repository/noticeRepository.js";

export async function addNotice(data, createdBy, updatedBy, role) {
  try {
    const payload = {
      ...data,
      createdBy,
      updatedBy,
      role,
    };
    return notice.addNotice(payload);
  } catch (error) {
    console.error("Transaction failed in add notice:", error);
    throw error;
  }
}

export async function getAllStudentNotice(role) {
  return notice.getAllStudentNotice(role);
}

export async function getAllEmployeeNotice(createdBy, role, academicYearId) {
  return notice.getAllEmployeeNotice(createdBy, role, academicYearId);
}

export async function updateNotice(noticeId, data, updatedBy) {
  return notice.updateNotice(noticeId, { ...data, updatedBy });
}

export async function deleteNotice(noticeId) {
  return notice.deleteNotice(noticeId);
}
