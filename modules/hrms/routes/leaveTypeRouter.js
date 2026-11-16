import { Router } from "express";
const router = Router();
import userAuth from "../../../middleware/authUser.js";
import {
  createLeaveType,
  getAllLeaveTypes,
  getLeaveTypeById,
  updateLeaveType,
  updateLeaveTypeStatus,
  deleteLeaveType,
} from "../controllers/leaveTypeController.js";

// Status update endpoints
router.patch("/status", userAuth, updateLeaveTypeStatus);
router.patch("/:id/status", userAuth, updateLeaveTypeStatus);

// Single item lookup via query (?id=...)
router.get("/single", userAuth, getLeaveTypeById);

// Standard CRUD endpoints
router.post("/", userAuth, createLeaveType);
router.get("/", userAuth, getAllLeaveTypes);
router.get("/:id", userAuth, getLeaveTypeById);
router.patch("/:id", userAuth, updateLeaveType);
router.patch("/", userAuth, updateLeaveType);
router.delete("/:id", userAuth, deleteLeaveType);
router.delete("/", userAuth, deleteLeaveType);

export default router;
