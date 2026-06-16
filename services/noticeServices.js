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

export async function getAllStudentNotice() {
  return notice.getAllStudentNotice();
}

export async function getAllEmployeeNotice(createdBy, role) {
  return notice.getAllEmployeeNotice(createdBy, role);
}

export async function updateNotice(noticeId, data, updatedBy) {
  data.updatedBy = updatedBy;
  return notice.updateNotice(noticeId, data);
}

export async function deleteNotice(noticeId) {
  return notice.deleteNotice(noticeId);
}
