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
