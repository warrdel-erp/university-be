import { Router } from "express";

const router = Router();

import userAuth from "../middleware/authUser.js";
import { addResultStudent } from "../controllers/resultStudentsController.js";

router.post("/", userAuth, addResultStudent);

export default router;
