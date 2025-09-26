import * as repo from "../repository/leavePolicyRepository.js";

export async function addPolicy(policyData) {
  try {
    return await repo.addPolicy(policyData);
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function getPolicies(universityId, instituteId) {
  return await repo.getPolicies(universityId, instituteId);
}

export async function getPolicyById(policyId, universityId) {
  return await repo.getPolicyById(policyId, universityId);
}

export async function updatePolicy(policyId, data) {
  return await repo.updatePolicy(policyId, data);
}

export async function deletePolicy(policyId) {
  return await repo.deletePolicy(policyId);
};