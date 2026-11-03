import * as service from "../services/approvalRequestService.js";

export async function createApprovalRequest(req, res) {
  try {
    const request = await service.createApprovalRequest(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: "Approval request created successfully",
      data: request,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAllApprovalRequests(req, res) {
  try {
    const filters = {};
    if (req.query.id) filters.id = req.query.id;
    if (req.query.approvalFor) filters.approvalFor = req.query.approvalFor;
    if (req.query.resourceId) filters.resourceId = req.query.resourceId;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.assignedToPositionId) filters.assignedToPositionId = req.query.assignedToPositionId;
    if (req.query.requestedBy) filters.requestedBy = req.query.requestedBy;

    const result = await service.getApprovalRequests(filters, req.query);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getApprovalRequestById(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required" });
    }

    const data = await service.getApprovalRequestById(id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getMySubmittedRequests(req, res) {
  try {
    const result = await service.getMySubmittedRequests(req.user, req.query);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getMyPendingApprovals(req, res) {
  try {
    const result = await service.getMyPendingApprovals(req.user, req.query);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function processApprovalAction(req, res) {
  try {
    const id = req.body.id || req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required" });
    }

    const updated = await service.processApprovalAction(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: `Approval request marked as ${req.body.status}`,
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

