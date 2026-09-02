import * as model from "../models/index.js";

export const validateEmployeeUser = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return { valid: false, status: 404, message: "User ID not found" };
  }
  const employeeRecord = await model.employeeModel.findOne({
    where: { userId },
  });
  return { valid: true, userId, employeeRecord: employeeRecord || null };
};

export function hasEmployeeRecord(validation) {
  return validation.valid && validation.employeeRecord != null;
}

export async function assertTeacherAssignedToDateWiseIds(userId, dateWiseIds) {
  const uniqueIds = [];
  const raw = Array.isArray(dateWiseIds) ? dateWiseIds : [dateWiseIds];
  for (const id of raw) {
    const num = Number(id);
    if (num && !uniqueIds.includes(num)) {
      uniqueIds.push(num);
    }
  }

  if (!uniqueIds.length) {
    return {
      valid: false,
      status: 400,
      message: "timeTableCellDateWiseId is required",
    };
  }

  const assignments = await model.timeTableCellTeachersDateWiseModel.findAll({
    where: {
      timeTableCellDateWiseId: uniqueIds,
      userId: Number(userId),
    },
    attributes: ["timeTableCellDateWiseId"],
  });

  if (assignments.length !== uniqueIds.length) {
    return {
      valid: false,
      status: 403,
      message:
        "Forbidden: You are not assigned to one or more of these scheduled periods.",
    };
  }

  return { valid: true, userId: Number(userId), dateWiseIds: uniqueIds };
}

export function emptyServiceTicketSummary() {
  return {
    openTickets: 0,
    assignedTickets: 0,
    inProgressTickets: 0,
    escalatedTickets: 0,
    resolvedMtd: 0,
  };
}

export function emptyEvaluationSummary() {
  return {
    totalAssigned: 0,
    evaluated: 0,
    pending: 0,
  };
}

export function emptyMyAnswerSheetSkuStats() {
  return {
    sku: [
      { key: "totalAssigned", label: "Total Assigned", value: 0 },
      { key: "graded", label: "Graded", value: 0 },
      { key: "notChecked", label: "Not Checked", value: 0 },
      { key: "overdue", label: "Overdue", value: 0 },
      { key: "dueToday", label: "Due Today", value: 0 },
    ],
  };
}

export function emptyPagination(page = 1, limit = 20) {
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 20;
  return {
    page: parsedPage,
    limit: parsedLimit,
    total: 0,
    totalPages: 0,
  };
}
