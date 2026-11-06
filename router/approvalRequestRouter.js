import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import {
  createApprovalRequest,
  getAllApprovalRequests,
  getApprovalRequestById,
  getMySubmittedRequests,
  getMyPendingApprovals,
  processApprovalAction,
} from "../controllers/approvalRequestController.js";

// Create a new approval request
router.post("/", userAuth, createApprovalRequest);

// Get all requests initiated by the logged-in user
router.get("/my", userAuth, getMySubmittedRequests);

// Get all pending approvals assigned to the logged-in user's active positions
router.get("/pending", userAuth, getMyPendingApprovals);

// Get a single request by query (?id=...)
router.get("/single", userAuth, getApprovalRequestById);

// Get a single request by param (/:id)
router.get("/:id", userAuth, getApprovalRequestById);

// Get list of all requests with filters (approvalFor, resourceId, status, etc.)
router.get("/", userAuth, getAllApprovalRequests);

// Approve, Reject, or Skip an approval request
router.patch("/action", userAuth, processApprovalAction);

export default router;

