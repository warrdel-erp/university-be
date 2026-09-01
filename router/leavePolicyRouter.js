import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import { addPolicy, getAllPolicies, getMyPolicies, getPolicyById, updatePolicy, deletePolicy } from "../controllers/leavePolicyController.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY_ADD.value, null), addPolicy);
router.get("/my", userAuth, getMyPolicies);
router.get("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY.value, null), getAllPolicies);
router.get("/single", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY.value, null), getPolicyById);
router.patch("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY_EDIT.value, null), updatePolicy);
router.delete("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY_DELETE.value, null), deletePolicy);

export default router;