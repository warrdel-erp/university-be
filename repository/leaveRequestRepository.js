import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addRequest(data, options = {}) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["userId"],
    where: { userId: data.userId },
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

  return scoped(model.leaveRequestModel).create(data, { transaction: options.transaction });
}

export async function getRequests(filters = {}) {
  const businessWhere = filters.userId ? { userId: filters.userId } : {};

  return scoped(model.leaveRequestModel).findAll({
    attributes: { exclude: ["deletedAt"] },
    where: businessWhere,
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveRequestsPolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
        attributes: ["policyId", "policyName", "totalLeavesPerYear"],
      },
      {
        model: model.users, as: "user",
        where: buildScope(model.employeeModel),
        required: true,
      },
    ],
  });
}

export async function getRequestById(requestId) {
  return scoped(model.leaveRequestModel).findOne({
    where: { requestId },
    attributes: { exclude: ["deletedAt"] },
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveRequestsPolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
        attributes: ["policyId", "policyName", "totalLeavesPerYear"],
      },
      {
        model: model.users, as: "user",
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

  return scoped(model.leaveRequestModel).update(data, {
    where: { requestId },
    transaction: options.transaction,
  });
}
