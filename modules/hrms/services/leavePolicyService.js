import * as repo from "../repository/leavePolicyRepository.js";
import * as balanceRepo from "../repository/leaveBalanceRepository.js";
import * as model from "../../../models/index.js";
import sequelize from "../../../database/sequelizeConfig.js";

export async function addPolicy(data) {
  try {
    const { entitlements, leaveEntitlements, roleAssignments, ...policyFields } = data;
    const finalEntitlements = entitlements || leaveEntitlements;

    // If payload contains entitlements or roleAssignments, use the full creation flow
    if ((finalEntitlements && finalEntitlements.length > 0) || (roleAssignments && roleAssignments.length > 0)) {
      const fullPolicy = await repo.createFullPolicy({
        policyData: policyFields,
        entitlements: finalEntitlements || [],
        roleAssignments: roleAssignments || [],
      });

      // If policy is published, auto-allocate initial balances
      if (policyFields.status === "Published") {
        await autoAllocateBalancesForPolicy(fullPolicy.policyId);
      }

      return fullPolicy;
    }

    // Fallback to basic policy creation
    return await repo.addPolicy(policyFields);
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function getPolicies(filters = {}) {
  return repo.getPolicies(filters);
}

export async function getActivePolicies(filters = {}) {
  return repo.getActivePolicies(filters);
}

export async function getPolicyById(policyId) {
  return repo.getPolicyById(policyId);
}

export async function updatePolicy(policyId, data) {
  return await repo.updatePolicy(policyId, data);
}

export async function deletePolicy(policyId) {
  return await repo.deletePolicy(policyId);
}

export async function getRolesSummary(context = {}) {
  return repo.getRolesSummary(context);
}

export async function getRoleEmployees(roleId, query = {}) {
  return repo.getRoleEmployees(roleId, query);
}

/**
 * Automatically creates/initializes leave_balance records for all employees
 * assigned to a published policy.
 */
export async function autoAllocateBalancesForPolicy(policyId) {
  const policy = await repo.getPolicyById(policyId);
  if (!policy) return;

  const currentYear = new Date().getFullYear();
  const rawPolicy = policy.toJSON ? policy.toJSON() : policy;
  const totalDays = rawPolicy.totalLeavesPerYear || 0;

  // Gather all user IDs that receive this policy
  const userIdsToAllocate = new Set();

  for (const ra of rawPolicy.roleAssignments || []) {
    if (ra.assignmentMode === "ALL") {
      // Find all users holding this role
      const [users] = await sequelize.query(`
        SELECT DISTINCT user_id FROM (
          SELECT user_id FROM user_role_permission_scope WHERE role_id = ${ra.roleId}
          UNION
          SELECT user_id FROM employee WHERE role_id = ${ra.roleId}
          UNION
          SELECT user_id FROM users WHERE default_role_id = ${ra.roleId}
        ) u
      `);
      for (const u of users) {
        if (u.user_id) userIdsToAllocate.add(u.user_id);
      }
    } else if (ra.assignmentMode === "SELECTED" && Array.isArray(ra.selectedEmployees)) {
      for (const emp of ra.selectedEmployees) {
        if (emp.userId) userIdsToAllocate.add(emp.userId);
      }
    }
  }

  // Create balance entries if not existing
  for (const userId of userIdsToAllocate) {
    const existing = await balanceRepo.getBalance(userId, policyId);
    if (!existing) {
      await balanceRepo.addBalance({
        userId,
        policyId,
        year: currentYear,
        totalAllocated: totalDays,
        usedLeaves: 0,
        remainingLeaves: totalDays,
      }).catch((e) => console.warn(`Leave balance allocation skipped for user ${userId}:`, e.message));
    }
  }
}
