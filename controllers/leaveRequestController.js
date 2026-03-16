import * as service from "../services/leaveRequestService.js";

export async function addRequest(req, res) {
  const requiredFields = ["employeeId", "policyId", "startDate", "endDate", "totalDays"];
  const data = {
    universityId: req.user.universityId,
    instituteId: req.user.defaultInstituteId,
    ...req.body
  };

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
    const { employeeId } = req.query
    const requests = await service.getRequests(
      req.user.universityId,
      req.user.defaultInstituteId,
      req.user.role, employeeId
    );
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRequestById(req, res) {
  try {
    const { requestId } = req.query;
    const request = await service.getRequestById(requestId, req.user.universityId);
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
};