import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import { addPolicy, getAllPolicies, getPolicyById, updatePolicy, deletePolicy } from "../controllers/leavePolicyController.js";

router.post("/", userAuth, addPolicy);
router.get("/", userAuth, getAllPolicies);
router.get("/single", userAuth, getPolicyById);
router.patch("/", userAuth, updatePolicy);
router.delete("/", userAuth, deletePolicy);

export default router;