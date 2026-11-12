import { Router } from "express";
const router = Router();
import userAuth from "../../../middleware/authUser.js";
import {
  addPolicy,
  getAllPolicies,
  getMyPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  getRolesSummary,
  getRoleEmployees,
} from "../controllers/leavePolicyController.js";
import { checkAccess } from "../../../middleware/checkAccess.js";
import { PERMISSIONS } from "../../../const/permissions.js";

// Helper routes for Create Leave Policy UI
router.get("/roles-summary", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY.value, null), getRolesSummary);
router.get("/role-employees/:roleId", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY.value, null), getRoleEmployees);

// Main Policy CRUD routes
router.post("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY_ADD.value, null), addPolicy);
router.get("/my", userAuth, getMyPolicies);
router.get("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY.value, null), getAllPolicies);
router.get("/single", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY.value, null), getPolicyById);
router.patch("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY_EDIT.value, null), updatePolicy);
router.delete("/", userAuth, checkAccess(PERMISSIONS.LEAVE_POLICY_DELETE.value, null), deletePolicy);

export default router;
