import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import { addRequest, getAllRequests, getRequestById, updateRequestStatus } from "../controllers/leaveRequestController.js";

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/", userAuth, checkAccess(PERMISSIONS.PENDING_LEAVE_REQUEST.value, null), addRequest);
router.get("/", userAuth, checkAccess(PERMISSIONS.PENDING_LEAVE_REQUEST.value, null), getAllRequests);
router.get("/single", userAuth, checkAccess(PERMISSIONS.PENDING_LEAVE_REQUEST.value, null), getRequestById);
router.patch("/status", userAuth, checkAccess(PERMISSIONS.PENDING_LEAVE_REQUEST.value, null), updateRequestStatus);

export default router;