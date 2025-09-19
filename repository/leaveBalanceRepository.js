import * as model from "../models/index.js";

export async function addBalance(data) {
  return await model.leaveBalanceModel.create(data);
}

export async function getBalancesByEmployee(employeeId) {
  return await model.leaveBalanceModel.findAll({
    where: { employeeId }
  });
}

export async function getBalance(employeeId, policyId) {
  return await model.leaveBalanceModel.findOne({ where: { employeeId, policyId } });
}

export async function updateBalance(balanceId, data) {
  return await model.leaveBalanceModel.update(data, { where: { balanceId } });
};