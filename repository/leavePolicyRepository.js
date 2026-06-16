import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function addPolicy(data) {
  return scoped(model.leavePolicyModel).create(data);
}

export async function getPolicies() {
  return scoped(model.leavePolicyModel).findAll({
    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
  });
}

export async function getPolicyById(policyId) {
  return scoped(model.leavePolicyModel).findOne({
    where: { policyId },
    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
  });
}

export async function updatePolicy(policyId, data) {
  const existing = await scoped(model.leavePolicyModel).findOne({
    attributes: ["policyId"],
    where: { policyId },
  });
  if (!existing) {
    return [0];
  }

  return scoped(model.leavePolicyModel).update(data, {
    where: { policyId },
  });
}

export async function deletePolicy(policyId) {
  const existing = await scoped(model.leavePolicyModel).findOne({
    attributes: ["policyId"],
    where: { policyId },
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.leavePolicyModel).destroy({
    where: { policyId },
  });
  return deleted > 0;
}
