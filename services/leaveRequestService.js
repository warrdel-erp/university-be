import * as repo from "../repository/leaveRequestRepository.js";
import * as balanceRepo from "../repository/leaveBalanceRepository.js";
import * as policyRepo from "../repository/leavePolicyRepository.js";

export async function addRequest(data) {
  try {
    const { employeeId, policyId, totalDays } = data;

    const policy = await policyRepo.getPolicyById(policyId);
    if (!policy || !policy.isActive) throw new Error("Policy not active");

    let balance = await balanceRepo.getBalance(employeeId, policyId);

    if (!balance) {
      balance = await balanceRepo.addBalance({
        employeeId,
        policyId,
        year: new Date().getFullYear(),
        totalAllocated: policy.totalLeavesPerYear,
        usedLeaves: 0,
        remainingLeaves: policy.totalLeavesPerYear,
      });
    }

    if (balance.remainingLeaves < totalDays) {
      throw new Error("Not enough leave balance");
    }

    await balanceRepo.updateBalance(balance.balanceId, {
      usedLeaves: balance.usedLeaves + totalDays,
      remainingLeaves: balance.remainingLeaves - totalDays,
    });

    return repo.addRequest(data);
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function getRequests(filters = {}) {
  return repo.getRequests(filters);
}

export async function getRequestById(requestId) {
  return repo.getRequestById(requestId);
}

export async function updateRequestStatus(requestId, status, reviewerId) {
  const request = await repo.getRequestById(requestId);
  if (!request) throw new Error("Request not found");

  const balance = await balanceRepo.getBalance(request.employeeId, request.policyId);

  if (status === "rejected") {
    await balanceRepo.updateBalance(balance.balanceId, {
      usedLeaves: balance.usedLeaves - request.totalDays,
      remainingLeaves: balance.remainingLeaves + request.totalDays,
    });
  }

  if (reviewerId) {
    return repo.updateRequest(requestId, {
      status,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    });
  }

  return repo.updateRequest(requestId, { status });
}
