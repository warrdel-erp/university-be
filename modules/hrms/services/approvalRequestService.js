import * as repo from "../repository/approvalRequestRepository.js";

export async function createApprovalRequest(data, user) {
  const { approvalFor, resourceId, assignedToPositionId } = data;

  if (!approvalFor || !resourceId || !assignedToPositionId) {
    throw new Error("approvalFor, resourceId, and assignedToPositionId are required");
  }

  const userId = user?.userId || user?.dataValues?.userId;
  if (!userId) {
    throw new Error("User identification missing");
  }

  const payload = {
    approvalFor,
    resourceId,
    assignedToPositionId,
    requestedBy: userId,
    level: data.level || 1,
    status: "pending",
    description: data.description || null,
    universityId: data.universityId || user?.universityId || user?.dataValues?.universityId || null,
    instituteId: data.instituteId || user?.defaultInstituteId || user?.dataValues?.defaultInstituteId || null,
    campusId: data.campusId || null,
    departmentId: data.departmentId || null,
  };

  return repo.createApprovalRequest(payload);
}

export async function getApprovalRequests(filters = {}, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const offset = (page - 1) * limit;

  const result = await repo.getApprovalRequests(filters, { limit, offset });
  return {
    total: result.count,
    page,
    limit,
    totalPages: Math.ceil(result.count / limit),
    data: result.rows,
  };
}

export async function getApprovalRequestById(id) {
  const request = await repo.getApprovalRequestById(id);
  if (!request) {
    throw new Error("Approval request not found");
  }
  return request;
}

export async function getMySubmittedRequests(user, query = {}) {
  const userId = user?.userId || user?.dataValues?.userId;
  if (!userId) throw new Error("User not found");

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const offset = (page - 1) * limit;

  const filters = {
    requestedBy: userId,
  };
  if (query.status) filters.status = query.status;
  if (query.approvalFor) filters.approvalFor = query.approvalFor;

  const result = await repo.getApprovalRequests(filters, { limit, offset });
  return {
    total: result.count,
    page,
    limit,
    totalPages: Math.ceil(result.count / limit),
    data: result.rows,
  };
}

export async function getMyPendingApprovals(user, query = {}) {
  const userId = user?.userId || user?.dataValues?.userId;
  if (!userId) throw new Error("User not found");

  const positionIds = await repo.getUserActivePositionIds(userId);
  if (!positionIds.length) {
    return { total: 0, page: 1, limit: 20, totalPages: 0, data: [] };
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const offset = (page - 1) * limit;

  const filters = {
    status: query.status || "pending",
  };
  if (query.approvalFor) filters.approvalFor = query.approvalFor;
  if (query.resourceId) filters.resourceId = query.resourceId;

  const result = await repo.getPendingApprovalsForPositions(positionIds, filters, { limit, offset });
  return {
    total: result.count,
    page,
    limit,
    totalPages: Math.ceil(result.count / limit),
    data: result.rows,
  };
}

export async function processApprovalAction(id, actionData, user) {
  const { status, description } = actionData;
  const validStatuses = ["approved", "rejected", "skipped"];

  if (!status || !validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const current = await repo.getApprovalRequestById(id);
  if (!current) {
    throw new Error("Approval request not found");
  }

  if (current.status !== "pending") {
    throw new Error(`Cannot action request. Current status is already '${current.status}'`);
  }

  const userId = user?.userId || user?.dataValues?.userId;
  const updatePayload = {
    status,
    actionAt: new Date(),
  };

  if (status === "approved" || status === "rejected") {
    updatePayload.approvedById = userId;
  } else if (status === "skipped") {
    updatePayload.skippedByUserId = userId;
  }

  if (description) {
    updatePayload.description = description;
  }

  await repo.updateApprovalRequest(id, updatePayload);

  // Sync back to target entity if it's a leave request
  if (current.approvalFor === "leave" && (status === "approved" || status === "rejected")) {
    const leaveService = await import("./leaveRequestService.js");
    await leaveService.updateRequestStatus(current.resourceId, status, userId, {
      skipApprovalSync: true,
    });
  }

  return repo.getApprovalRequestById(id);
}

