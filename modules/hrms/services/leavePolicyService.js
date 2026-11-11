import * as repo from "../repository/leavePolicyRepository.js";

export async function addPolicy(policyData) {
  try {
    return await repo.addPolicy(policyData);
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function getPolicies() {
  return repo.getPolicies();
}

export async function getActivePolicies() {
  return repo.getActivePolicies();
}

export async function getPolicyById(policyId) {
  return repo.getPolicyById(policyId);
}

export async function updatePolicy(policyId, data) {
  return await repo.updatePolicy(policyId, data);
}

export async function deletePolicy(policyId) {
  return await repo.deletePolicy(policyId);
};