import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addBalance(data, options = {}) {
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

  return model.leaveBalanceModel.unscoped().create(data, { transaction: options.transaction });
}

export async function getBalancesByEmployee(employeeId) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["employeeId"],
    where: { employeeId },
  });
  if (!employee) {
    return [];
  }

  return model.leaveBalanceModel.unscoped().findAll({
    where: { employeeId },
    include: [
      {
        model: model.leavePolicyModel.unscoped(),
        as: "leaveBalancePolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
      },
    ],
  });
}

export async function getBalance(employeeId, policyId) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["employeeId"],
    where: { employeeId },
  });
  if (!employee) {
    return null;
  }

  return model.leaveBalanceModel.unscoped().findOne({
    where: { employeeId, policyId },
    include: [
      {
        model: model.leavePolicyModel.unscoped(),
        as: "leaveBalancePolicy",
        where: buildScope(model.leavePolicyModel),
        required: true,
      },
    ],
  });
}

export async function updateBalance(balanceId, data, options = {}) {
  const balance = await model.leaveBalanceModel.unscoped().findOne({
    attributes: ["balanceId", "employeeId", "policyId"],
    where: { balanceId },
    include: [
      {
        model: model.leavePolicyModel.unscoped(),
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

  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["employeeId"],
    where: { employeeId: balance.employeeId },
    transaction: options.transaction,
  });
  if (!employee) {
    return [0];
  }

  return model.leaveBalanceModel.unscoped().update(data, {
    where: { balanceId },
    transaction: options.transaction,
  });
}
