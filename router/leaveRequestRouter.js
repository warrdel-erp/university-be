import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import { addRequest, getAllRequests, getRequestById, updateRequestStatus } from "../controllers/leaveRequestController.js";

router.post("/", userAuth, addRequest);
router.get("/", userAuth, getAllRequests);
router.get("/single", userAuth, getRequestById);
router.patch("/status", userAuth, updateRequestStatus);

export default router;