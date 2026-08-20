import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import { addRequest, getAllRequests, getRequestById, updateRequestStatus } from "../controllers/leaveRequestController.js";

import { checkAccess, checkAccessAny } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { z } from "zod";
import { validate } from "../utility/validation.js";

const leaveRequestQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  userId: z.coerce.number().int().positive().optional(),
});

router.post("/", userAuth, checkAccessAny([PERMISSIONS.PENDING_LEAVE_REQUEST.value, PERMISSIONS.APPLY_LEAVE_ADD.value], null), addRequest);
router.get("/", userAuth, checkAccessAny([PERMISSIONS.PENDING_LEAVE_REQUEST.value, PERMISSIONS.APPLY_LEAVE.value], null), validate({ query: leaveRequestQuerySchema }), getAllRequests);
router.get("/single", userAuth, checkAccessAny([PERMISSIONS.PENDING_LEAVE_REQUEST.value, PERMISSIONS.APPLY_LEAVE.value], null), getRequestById);
router.patch("/status", userAuth, checkAccess(PERMISSIONS.PENDING_LEAVE_REQUEST.value, null), updateRequestStatus);

export default router;