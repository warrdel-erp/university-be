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

  // If rejected, refund previously deducted leaves
  if (status === "rejected" && balance) {
    await balanceRepo.updateBalance(balance.balanceId, {
      usedLeaves: balance.usedLeaves - request.totalDays,
      remainingLeaves: balance.remainingLeaves + request.totalDays,
    });
  }

  const updateData = { status };
  if (reviewerId) {
    updateData.reviewedBy = reviewerId;
    updateData.reviewedAt = new Date();
  }

  const updated = await repo.updateRequest(requestId, updateData);

  // Synchronize approval_requests table if not triggered from approval service
  if (!options.skipApprovalSync) {
    const existingApproval = await scoped(model.approvalRequestModel).findOne({
      where: {
        approvalFor: "leave",
        resourceId: requestId,
        status: "pending",
      },
    });

    if (existingApproval) {
      await approvalRepo.updateApprovalRequest(existingApproval.id, {
        status,
        approvedById: reviewerId || null,
        actionAt: new Date(),
      });
    }
  }

  return updated;
}
