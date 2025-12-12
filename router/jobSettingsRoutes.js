import express from "express";
import {
  addJobType,
  getAllJobTypes,
  updateJobType,
  deleteJobType,
  getSingleJobType
} from "../controllers/jobSettingsController.js";import useAuth from "../middleware/authUser.js";
;

const router = express.Router();

router.post("/add",useAuth, addJobType);
router.get("/list",useAuth, getAllJobTypes);
router.get("/:id",useAuth, getSingleJobType);
router.patch("/update/:id",useAuth, updateJobType);
router.delete("/delete/:id",useAuth, deleteJobType);

export default router;