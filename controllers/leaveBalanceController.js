import * as service from "../services/leaveBalanceService.js";
import { validateEmployeeUser } from "../utility/employeeValidation.js";

export async function addBalance(req, res) {
  const requiredFields = ["userId", "policyId", "year", "totalAllocated", "remainingLeaves"];
  const data = { ...req.body };

  try {
    for (const f of requiredFields) {
      if (!data[f]) return res.status(400).json({ message: `${f} is required` });
    }

    const balance = await service.addBalance(data);
    res.status(201).json({ message: "Leave balance initialized", balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getBalancesByEmployee(req, res) {
  try {
    const balances = await service.getBalancesByEmployee(req.params.userId);
    res.status(200).json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyBalances(req, res) {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return res.status(validation.status).json({ message: validation.message });
    }
    if (!validation.employeeRecord) {
      return res.status(200).json([]);
    }

    const balances = await service.getBalancesByEmployee(validation.userId);
    res.status(200).json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateBalance(req, res) {
  try {
    const { balanceId } = req.body;
    if (!balanceId) return res.status(400).json({ message: "balanceId is required" });

    await service.updateBalance(balanceId, req.body);
    res.status(200).json({ message: "Balance updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};