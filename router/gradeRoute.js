import express from "express";
import {
  addGradeScheme,
  getAllGradeSchemes,
  getSingleGradeScheme,
  updateGradeScheme,
  deleteGradeScheme
} from "../controllers/gradeController.js";
import useAuth from "../middleware/authUser.js";

const router = express.Router();

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post("/add", useAuth, checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null), addGradeScheme);
router.get("/list", useAuth, checkAccess(PERMISSIONS.GRADING_SETUP.value, null), getAllGradeSchemes);
router.get("/:id", useAuth, checkAccess(PERMISSIONS.GRADING_SETUP.value, null), getSingleGradeScheme);
router.patch("/update/:id", useAuth, checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null), updateGradeScheme);
// router.delete("/delete/:id", useAuth, checkAccess(PERMISSIONS.GRADING_SETUP_DELETE.value, null), deleteGradeScheme);

export default router;
