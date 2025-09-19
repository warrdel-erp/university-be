import * as repo from "../repository/leaveBalanceRepository.js";

export async function addBalance(data) {
  try {
    return await repo.addBalance(data);
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function getBalancesByEmployee(employeeId) {
  return await repo.getBalancesByEmployee(employeeId);
}

export async function updateBalance(balanceId, data) {
  return await repo.updateBalance(balanceId, data);
};