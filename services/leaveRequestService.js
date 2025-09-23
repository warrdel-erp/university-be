import * as repo from "../repository/leaveRequestRepository.js";
import * as balanceRepo from "../repository/leaveBalanceRepository.js";
import * as policyRepo from "../repository/leavePolicyRepository.js";

export async function addRequest(data) {
  try {
    const { employeeId, policyId, totalDays, universityId } = data;

    // 1. Check policy is active
    const policy = await policyRepo.getPolicyById(policyId, universityId);
    if (!policy || !policy.isActive) throw new Error("Policy not active");

    // 2. Check leave balance
    let balance = await balanceRepo.getBalance(employeeId, policyId);

    // 👉 If no balance exists, initialize it with policy total_leaves_per_year
    if (!balance) {
      balance = await balanceRepo.addBalance({
        employeeId,
        policyId,
        year: new Date().getFullYear(),
        totalAllocated: policy.totalLeavesPerYear,
        usedLeaves: 0,
        remainingLeaves: policy.totalLeavesPerYear
      });
    }

    // 3. Validate balance
    if (balance.remainingLeaves < totalDays) {
      throw new Error("Not enough leave balance");
    }

    // 4. Deduct balance
    await balanceRepo.updateBalance(balance.balanceId, {
      usedLeaves: balance.usedLeaves + totalDays,
      remainingLeaves: balance.remainingLeaves - totalDays
    });

    // 5. Save request
    return await repo.addRequest(data);
  } catch (err) {
    throw new Error(err.message);
  }
}


export async function getRequests(universityId, instituteId, role, employeeId) {
  return await repo.getRequests(universityId, instituteId, role, employeeId);
}

export async function getRequestById(requestId, universityId) {
  return await repo.getRequestById(requestId, universityId);
}

export async function updateRequestStatus(requestId, status, reviewerId) {
  const request = await repo.getRequestById(requestId);
  if (!request) throw new Error("Request not found");

  const balance = await balanceRepo.getBalance(request.employeeId, request.policyId);

  if (status === "rejected") {
    await balanceRepo.updateBalance(balance.balanceId, {
      usedLeaves: balance.usedLeaves - request.totalDays,
      remainingLeaves: balance.remainingLeaves + request.totalDays
    });
  }
  if(reviewerId){
    return await repo.updateRequest(requestId, { status, reviewedBy: reviewerId, reviewedAt: new Date() });
  }else{
  return await repo.updateRequest(requestId, { status});
  }
}