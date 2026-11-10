import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/leaveRequestRepository.js";
import * as balanceRepo from "../repository/leaveBalanceRepository.js";
import * as policyRepo from "../repository/leavePolicyRepository.js";
import * as approvalRepo from "../repository/approvalRequestRepository.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function addRequest(data) {
  const { userId, policyId, startDate, endDate, totalDays } = data;

  // 1. Date Format & Range Validation
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date format for startDate or endDate (expected YYYY-MM-DD)");
  }

  if (start > end) {
    throw new Error("startDate cannot be greater than endDate");
  }

  if (!totalDays || Number(totalDays) <= 0) {
    throw new Error("totalDays must be a positive number greater than 0");
  }

  // 2. Overlapping Active Leave Check
  const activeLeave = await repo.checkOverlappingLeave(userId, startDate, endDate);
  if (activeLeave) {
    throw new Error(
      `User already has an active leave request (${activeLeave.status}) from ${activeLeave.startDate} to ${activeLeave.endDate}. You cannot apply for overlapping dates.`
    );
  }

  // 3. Policy & Balance Verification
  const policy = await policyRepo.getPolicyById(policyId);
  if (!policy || !policy.isActive) {
    throw new Error("Policy not active or not found");
  }

  let balance = await balanceRepo.getBalance(userId, policyId);
  if (!balance) {
    balance = await balanceRepo.addBalance({
      userId,
      policyId,
      year: new Date().getFullYear(),
      totalAllocated: policy.totalLeavesPerYear,
      usedLeaves: 0,
      remainingLeaves: policy.totalLeavesPerYear,
    });
  }

  if (balance.remainingLeaves < Number(totalDays)) {
    throw new Error("Not enough leave balance");
  }

  // 4. Resolve Approver Position
  let targetPositionId = data.assignedToPositionId;
  if (!targetPositionId) {
    targetPositionId = await repo.resolveApproverPosition(userId);
  }
  if (!targetPositionId) {
    throw new Error(
      "Approver position could not be determined. Please specify assignedToPositionId."
    );
  }

  // 5. Atomic Transaction: Deduct Balance + Save Leave Request + Create Approval Request
  return sequelize.transaction(async (t) => {
    // Deduct leave balance
    await balanceRepo.updateBalance(
      balance.balanceId,
      {
        usedLeaves: balance.usedLeaves + Number(totalDays),
        remainingLeaves: balance.remainingLeaves - Number(totalDays),
      },
      { transaction: t }
    );

    // Create leave request record
    const leaveRequest = await repo.addRequest(data, { transaction: t });
    const rawLeave = leaveRequest.toJSON ? leaveRequest.toJSON() : leaveRequest;

    // Simultaneously create approval_requests record
    const approvalRequest = await approvalRepo.createApprovalRequest(
      {
        approvalFor: "leave",
        resourceId: rawLeave.requestId,
        requestedBy: userId,
        assignedToPositionId: targetPositionId,
        level: 1,
        status: "pending",
        description: data.reason || "Leave application request",
        universityId: data.universityId || rawLeave.universityId || null,
        instituteId: data.instituteId || rawLeave.instituteId || null,
        campusId: data.campusId || rawLeave.campusId || null,
        departmentId: data.departmentId || rawLeave.departmentId || null,
      },
      { transaction: t }
    );

    return {
      ...rawLeave,
      approvalRequest: approvalRequest.toJSON ? approvalRequest.toJSON() : approvalRequest,
    };
  });
}

export async function getRequests(filters = {}) {
  return repo.getRequests(filters);
}

export async function getRequestById(requestId) {
  return repo.getRequestById(requestId);
}

export async function updateRequestStatus(requestId, status, reviewerId, options = {}) {
  const request = await repo.getRequestById(requestId);
  if (!request) throw new Error("Leave request not found");

  const balance = await balanceRepo.getBalance(request.userId, request.policyId);

  // If rejected, cancelled, or skipped, refund previously deducted leaves
  if ((status === "rejected" || status === "cancelled" || status === "skipped") && balance) {
    await balanceRepo.updateBalance(balance.balanceId, {
      usedLeaves: Math.max(0, balance.usedLeaves - request.totalDays),
      remainingLeaves: balance.remainingLeaves + request.totalDays,
    });
  }

  const updateData = { status };
  if (reviewerId) {
    updateData.reviewedBy = reviewerId;
    updateData.reviewedAt = new Date();
  }

  await repo.updateRequest(requestId, updateData);

  // Synchronize or create entry in approval_requests table
  let approvalData = null;
  if (!options.skipApprovalSync) {
    const existingApproval = await scoped(model.approvalRequestModel).findOne({
      where: {
        approvalFor: "leave",
        resourceId: requestId,
      },
    });

    if (existingApproval) {
      const approvalUpdate = {
        status,
        actionAt: new Date(),
      };
      if (status === "approved" || status === "rejected") {
        approvalUpdate.approvedById = reviewerId || null;
      } else if (status === "cancelled" || status === "skipped") {
        approvalUpdate.skippedByUserId = reviewerId || null;
      }
      if (options.description) {
        approvalUpdate.description = options.description;
      }
      await approvalRepo.updateApprovalRequest(existingApproval.id, approvalUpdate);
      approvalData = await approvalRepo.getApprovalRequestById(existingApproval.id);
    } else {
      // If no approval_requests row existed yet, create one now!
      let targetPositionId = await repo.resolveApproverPosition(request.userId);
      approvalData = await approvalRepo.createApprovalRequest({
        approvalFor: "leave",
        resourceId: requestId,
        requestedBy: request.userId,
        assignedToPositionId: targetPositionId || 1,
        level: 1,
        status,
        approvedById: (status === "approved" || status === "rejected") ? reviewerId : null,
        skippedByUserId: (status === "cancelled" || status === "skipped") ? reviewerId : null,
        actionAt: new Date(),
        description: options.description || request.reason || "Leave request",
        universityId: request.universityId || null,
        instituteId: request.instituteId || null,
        campusId: request.campusId || null,
        departmentId: request.departmentId || null,
      });
    }
  }

  const freshLeave = await repo.getRequestById(requestId);
  const plainLeave = freshLeave?.toJSON ? freshLeave.toJSON() : freshLeave;
  return {
    ...plainLeave,
    approvalRequest: approvalData,
  };
}

export async function getLeavesAssignedToMe(user, query = {}) {
  const userId = user?.userId || user?.dataValues?.userId;
  if (!userId) throw new Error("User not found");

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const offset = (page - 1) * limit;

  const result = await repo.getLeavesAssignedToUserPositions(userId, query, { limit, offset, user });
  return {
    total: result.count,
    page,
    limit,
    totalPages: Math.ceil(result.count / limit),
    data: result.rows,
  };
}
