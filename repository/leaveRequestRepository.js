import * as model from "../models/index.js";

export async function addRequest(data) {
  return await model.leaveRequestModel.create(data);
}

export async function getRequests(universityId, instituteId, role, employeeId) {
  return await model.leaveRequestModel.findAll({
    attributes: { exclude: ["deletedAt"] },
            where:  { employeeId } , 
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveRequestsPolicy",
        where: {
          ...(universityId && { universityId }),
          ...(role === 'Head' && { instituteId }),
        },
        attributes: ["policyId", "policyName", "totalLeavesPerYear"]
      },
      {
        model: model.employeeModel,
        as: "employeeRequest",
      }
    ]
  });
}

export async function getRequestById(requestId, universityId) {
  return await model.leaveRequestModel.findOne({
    where: { requestId },
    attributes: { exclude: ["deletedAt"] },
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveRequestsPolicy",
        where: {
          ...(universityId && { universityId }),
        },
        attributes: ["policyId", "policyName", "totalLeavesPerYear"]
      },
      {
        model: model.employeeModel,
        as: "employeeRequest",
      }
    ]
  });
}

export async function updateRequest(requestId, data) {
  return await model.leaveRequestModel.update(data, { where: { requestId } });
};