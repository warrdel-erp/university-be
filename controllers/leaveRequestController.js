import * as service from "../services/leaveRequestService.js";
import { validateEmployeeUser } from "../utility/employeeValidation.js";

export async function addRequest(req, res) {
  const requiredFields = ["userId", "policyId", "startDate", "endDate", "totalDays"];
  const data = { ...req.body };

  try {
    for (const f of requiredFields) {
      if (!data[f]) return res.status(400).json({ message: `${f} is required` });
    }

    const request = await service.addRequest(data);
    res.status(201).json({ message: "Leave request submitted", request });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function addMyRequest(req, res) {
  const validation = await validateEmployeeUser(req, res);
  if (!validation.valid) {
    return res.status(validation.status).json({ message: validation.message });
  }
  if (!validation.employeeRecord) {
    return res.status(200).json({});
  }

  const requiredFields = ["policyId", "startDate", "endDate", "totalDays"];
  const data = { ...req.body, userId: validation.userId };

  try {
    for (const f of requiredFields) {
      if (!data[f]) return res.status(400).json({ message: `${f} is required` });
    }

    const request = await service.addRequest(data);
    res.status(201).json({ message: "Leave request submitted", request });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getAllRequests(req, res) {
  try {
    const { userId } = req.query;
    const requests = await service.getRequests({ userId });
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyRequests(req, res) {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return res.status(validation.status).json({ message: validation.message });
    }
    if (!validation.employeeRecord) {
      return res.status(200).json([]);
    }

    const requests = await service.getRequests({ userId: validation.userId });
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRequestById(req, res) {
  try {
    const { requestId } = req.query;
    const request = await service.getRequestById(requestId);
    request ? res.status(200).json(request) : res.status(404).json({ message: "Request not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateRequestStatus(req, res) {
  try {
    const { requestId, status, reviewerId } = req.body;
    if (!requestId || !status) return res.status(400).json({ message: "requestId and status are required" });

    const updated = await service.updateRequestStatus(requestId, status, reviewerId);
    res.status(200).json({ message: "Request status updated", updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateMyRequestStatus(req, res) {
  const validation = await validateEmployeeUser(req, res);
  if (!validation.valid) {
    return res.status(validation.status).json({ message: validation.message });
  }
  if (!validation.employeeRecord) {
    return res.status(200).json({});
  }

  try {
    const { requestId, status } = req.body;
    if (!requestId || !status) return res.status(400).json({ message: "requestId and status are required" });

    const request = await service.getRequestById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.userId !== validation.userId) return res.status(403).json({ message: "Forbidden" });

    const updated = await service.updateRequestStatus(requestId, status, validation.userId);
    res.status(200).json({ message: "Request status updated", updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
