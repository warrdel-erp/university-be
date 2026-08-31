import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import { addRequest, addMyRequest, getAllRequests, getMyRequests, getRequestById, updateRequestStatus, updateMyRequestStatus } from "../controllers/leaveRequestController.js";

import { checkAccess, checkAccessAny } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/", userAuth, checkAccessAny([PERMISSIONS.PENDING_LEAVE_REQUEST.value, PERMISSIONS.APPLY_LEAVE_ADD.value], null), addRequest);
router.post("/my", userAuth, checkAccess(PERMISSIONS.APPLY_LEAVE.value, null), addMyRequest);
router.get("/my", userAuth, checkAccess(PERMISSIONS.APPLY_LEAVE.value, null), getMyRequests);
router.get("/", userAuth, checkAccessAny([PERMISSIONS.PENDING_LEAVE_REQUEST.value, PERMISSIONS.APPLY_LEAVE.value], null), getAllRequests);
router.get("/single", userAuth, checkAccessAny([PERMISSIONS.PENDING_LEAVE_REQUEST.value, PERMISSIONS.APPLY_LEAVE.value], null), getRequestById);
router.patch("/status", userAuth, checkAccess(PERMISSIONS.PENDING_LEAVE_REQUEST.value, null), updateRequestStatus);
router.patch("/status/my", userAuth, checkAccess(PERMISSIONS.APPLY_LEAVE.value, null), updateMyRequestStatus);

export default router;
