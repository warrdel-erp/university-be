import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addRequest(data, options = {}) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["employeeId"],
    where: { employeeId: data.employeeId },
    transaction: options.transaction,
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

  const policy = await scoped(model.leavePolicyModel).findOne({
    attributes: ["policyId"],
    where: { policyId: data.policyId },
    transaction: options.transaction,
  });
  if (!policy) {
    throw new Error("Leave policy not found");
  }

  return model.leaveRequestModel.unscoped().create(data, { transaction: options.transaction });
}

export async function getRequests(filters = {}) {
  const businessWhere = filters.employeeId ? { employeeId: filters.employeeId } : {};

  return model.leaveRequestModel.unscoped().findAll({
    attributes: { exclude: ["deletedAt"] },
    where: businessWhere,
    include: [
      {
        model: model.leavePolicyModel.unscoped(),
        as: "leaveRequestsPolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
        attributes: ["policyId", "policyName", "totalLeavesPerYear"],
      },
      {
        model: model.employeeModel.unscoped(),
        as: "employeeRequest",
        where: buildScope(model.employeeModel),
        required: true,
      },
    ],
  });
}

export async function getRequestById(requestId) {
  return model.leaveRequestModel.unscoped().findOne({
    where: { requestId },
    attributes: { exclude: ["deletedAt"] },
    include: [
      {
        model: model.leavePolicyModel.unscoped(),
        as: "leaveRequestsPolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
        attributes: ["policyId", "policyName", "totalLeavesPerYear"],
      },
      {
        model: model.employeeModel.unscoped(),
        as: "employeeRequest",
        where: buildScope(model.employeeModel),
        required: true,
      },
    ],
  });
}

export async function updateRequest(requestId, data, options = {}) {
  const existing = await getRequestById(requestId);
  if (!existing) {
    return [0];
  }

  return model.leaveRequestModel.unscoped().update(data, {
    where: { requestId },
    transaction: options.transaction,
  });
}
