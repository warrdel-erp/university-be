import * as service from "../services/leavePolicyService.js";

export async function addPolicy(req, res) {
  const requiredFields = ["policyName", "totalLeavesPerYear"];
  const data = {
    universityId: req.user.universityId,
    instituteId: req.user.defaultInstituteId,
    createdBy: req.user.userId,
    updatedBy: req.user.userId,
    ...req.body
  };

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
    const policies = await service.getPolicies(req.user.universityId, req.user.defaultInstituteId);
    res.status(200).json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPolicyById(req, res) {
  try {
    const { policyId } = req.query;
    const policy = await service.getPolicyById(policyId, req.user.universityId);
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
};