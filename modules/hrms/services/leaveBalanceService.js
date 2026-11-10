import * as repo from "../repository/leaveBalanceRepository.js";

export async function addBalance(data) {
  try {
    return await repo.addBalance(data);
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function getBalancesByEmployee(userId) {
  return await repo.getBalancesByEmployee(userId);
}

export async function updateBalance(balanceId, data) {
  return await repo.updateBalance(balanceId, data);
};