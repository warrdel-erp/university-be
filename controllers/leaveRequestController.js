import * as service from "../services/leaveRequestService.js";
import { SuccessResponse } from "../utility/response.js";

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

export async function getAllRequests(req, res) {
  try {
    const { userId, page = 1, limit = 10, search } = req.query;
    const result = await service.getRequests({ userId, page, limit, search });
    
    return SuccessResponse(
      res,
      200,
      "Leave requests fetched successfully",
      result.rows,
      {
        total: result.total,
        limit: parseInt(limit, 10),
        page: parseInt(page, 10),
      }
    );
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
