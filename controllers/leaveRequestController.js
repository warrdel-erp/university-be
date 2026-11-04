import * as service from "../services/leaveRequestService.js";
import * as approvalRepo from "../repository/approvalRequestRepository.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

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
  const userId = req.user?.userId || req.user?.dataValues?.userId;
  if (!userId) {
    return res.status(404).json({ message: "User ID not found" });
  }

  const requiredFields = ["policyId", "startDate", "endDate", "totalDays"];
  const data = { ...req.body, userId };

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
    const userId = req.user?.userId || req.user?.dataValues?.userId;
    if (!userId) {
      return res.status(404).json({ message: "User ID not found" });
    }

    const requests = await service.getRequests({ userId });
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getLeavesAssignedToMe(req, res) {
  try {
    const result = await service.getLeavesAssignedToMe(req.user, req.query);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
    const { requestId, status } = req.body;
    const reviewerId = req.body.reviewerId || req.user?.userId || req.user?.dataValues?.userId;
    if (!requestId || !status) return res.status(400).json({ message: "requestId and status are required" });

    const updated = await service.updateRequestStatus(requestId, status, reviewerId);
    res.status(200).json({ message: "Request status updated", updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateMyRequestStatus(req, res) {
  const userId = req.user?.userId || req.user?.dataValues?.userId;
  if (!userId) {
    return res.status(404).json({ message: "User ID not found" });
  }

  try {
    const { requestId, status, description } = req.body;
    if (!requestId || !status) return res.status(400).json({ message: "requestId and status are required" });

    // An employee can ONLY cancel their own leave request
    if (status !== "cancelled") {
      return res.status(400).json({
        message: "Invalid status. Employees can only set status to 'cancelled' on /my/status. Approvals and rejections must be processed by approvers.",
      });
    }

    const request = await service.getRequestById(requestId);
    if (!request) return res.status(404).json({ message: "Leave request not found" });

    if (request.userId !== userId) {
      return res.status(403).json({ message: "Forbidden: You can only cancel your own leave requests." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: `Cannot cancel this leave request because it is already '${request.status}'`,
      });
    }

    const updated = await service.updateRequestStatus(requestId, "cancelled", userId, { description });
    res.status(200).json({ message: "Leave request cancelled successfully", updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
