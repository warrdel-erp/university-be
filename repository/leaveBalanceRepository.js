import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addBalance(data, options = {}) {
  const policy = await scoped(model.leavePolicyModel).findOne({
    attributes: ["policyId"],
    where: { policyId: data.policyId },
    transaction: options.transaction,
  });
  if (!policy) {
    throw new Error("Leave policy not found");
  }

  return scoped(model.leaveBalanceModel).create(data, { transaction: options.transaction });
}

export async function getBalancesByEmployee(userId) {
  return scoped(model.leaveBalanceModel).findAll({
    where: { userId },
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveBalancePolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
      },
    ],
  });
}

export async function getBalance(userId, policyId) {
  return scoped(model.leaveBalanceModel).findOne({
    where: { userId, policyId },
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveBalancePolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
      },
    ],
  });
}

export async function updateBalance(balanceId, data, options = {}) {
  const balance = await scoped(model.leaveBalanceModel).findOne({
    attributes: ["balanceId", "userId", "policyId"],
    where: { balanceId },
    include: [
      {
        model: model.leavePolicyModel,
        as: "leaveBalancePolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
      },
    ],
    transaction: options.transaction,
  });
  if (!balance) {
    return [0];
  }

  return scoped(model.leaveBalanceModel).update(data, {
    where: { balanceId },
    transaction: options.transaction,
  });
}
