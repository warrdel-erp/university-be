import { Router } from "express";
const router = Router();
import userAuth from "../middleware/authUser.js";
import { addBalance, getBalancesByEmployee, updateBalance } from "../controllers/leaveBalanceController.js";

router.post("/", userAuth, addBalance);
router.get("/:userId", userAuth, getBalancesByEmployee);
router.patch("/", userAuth, updateBalance);

export default router;