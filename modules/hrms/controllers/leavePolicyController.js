import * as service from "../services/leavePolicyService.js";

export async function addPolicy(req, res) {
  const requiredFields = ["policyName"];
  const data = {
    createdBy: req.user.userId,
    updatedBy: req.user.userId,
    ...req.body,
  };

  // If totalLeavesPerYear is not provided, calculate sum from entitlements
  const entitlements = data.entitlements || data.leaveEntitlements;
  if (!data.totalLeavesPerYear && Array.isArray(entitlements) && entitlements.length > 0) {
    data.totalLeavesPerYear = entitlements.reduce(
      (sum, e) => sum + (Number(e.entitlementAnnual) || 0),
      0
    );
  }

  try {
    for (const f of requiredFields) {
      if (!data[f]) return res.status(400).json({ message: `${f} is required` });
    }

    const policy = await service.addPolicy(data);
    res.status(201).json({ message: "Policy created successfully", policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAllPolicies(req, res) {
  try {
    const viewAll = req.query.all === "true" || req.query.all === "1";
    const roleId = viewAll
      ? null
      : req.query.roleId
      ? parseInt(req.query.roleId, 10)
      : req.user?.defaultRoleId || req.user?.dataValues?.defaultRoleId;

    const userId = req.query.userId
      ? parseInt(req.query.userId, 10)
      : req.user?.userId || req.user?.dataValues?.userId;

    const ignoreEmployeeFilter =
      req.query.ignoreEmployeeFilter === "true" || req.query.allEmployees === "true";

    const policies = await service.getPolicies({
      roleId,
      userId,
      ignoreEmployeeFilter,
      status: req.query.status,
    });
    res.status(200).json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyPolicies(req, res) {
  try {
    const roleId = req.user?.defaultRoleId || req.user?.dataValues?.defaultRoleId;
    const userId = req.user?.userId || req.user?.dataValues?.userId;

    const policies = await service.getActivePolicies({
      roleId,
      userId,
      ignoreEmployeeFilter: false,
    });
    res.status(200).json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPolicyById(req, res) {
  try {
    const policyId = req.query.policyId || req.params.policyId;
    if (!policyId) return res.status(400).json({ message: "policyId is required" });

    const policy = await service.getPolicyById(policyId);
    policy ? res.status(200).json(policy) : res.status(404).json({ message: "Policy not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updatePolicy(req, res) {
  try {
    const { policyId } = req.body;
    if (!policyId) return res.status(400).json({ message: "policyId is required" });

    await service.updatePolicy(policyId, req.body);
    res.status(200).json({ message: "Policy updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deletePolicy(req, res) {
  try {
    const { policyId } = req.query;
    if (!policyId) return res.status(400).json({ message: "policyId is required" });

    const deleted = await service.deletePolicy(policyId);
    deleted
      ? res.status(200).json({ message: "Policy deleted" })
      : res.status(404).json({ message: "Policy not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to fetch all roles summary for the UI Role Assignment table
 */
export async function getRolesSummary(req, res) {
  try {
    const instituteId = req.user?.defaultInstituteId || req.user?.dataValues?.defaultInstituteId;
    const universityId = req.user?.universityId || req.user?.dataValues?.universityId;

    const summary = await service.getRolesSummary({
      instituteId,
      universityId,
    });
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to fetch all employees of a specific role for the right drawer
 */
export async function getRoleEmployees(req, res) {
  try {
    const { roleId } = req.params;
    if (!roleId) return res.status(400).json({ message: "roleId is required" });

    const instituteId = req.user?.defaultInstituteId || req.user?.dataValues?.defaultInstituteId;
    const universityId = req.user?.universityId || req.user?.dataValues?.universityId;

    const result = await service.getRoleEmployees(roleId, {
      ...req.query,
      instituteId,
      universityId,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
