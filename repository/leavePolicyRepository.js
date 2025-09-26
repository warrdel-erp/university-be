import * as model from "../models/index.js";

export async function addPolicy(data) {
  return await model.leavePolicyModel.create(data);
}

export async function getPolicies(universityId, instituteId) {
  return await model.leavePolicyModel.findAll({
    where: { universityId, instituteId},
    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
  });
}

export async function getPolicyById(policyId, universityId) {
  return await model.leavePolicyModel.findOne({
    where: { policyId, universityId },
    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
  });
}

export async function updatePolicy(policyId, data) {
  return await model.leavePolicyModel.update(data, { where: { policyId } });
}

export async function deletePolicy(policyId) {
  return await model.leavePolicyModel.destroy({ where: { policyId } });
}
