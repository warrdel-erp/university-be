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

router.post("/add", useAuth, addGradeScheme);
router.get("/list", useAuth, getAllGradeSchemes);
router.get("/:id", useAuth, getSingleGradeScheme);
router.patch("/update/:id", useAuth, updateGradeScheme);
router.delete("/delete/:id", useAuth, deleteGradeScheme);

export default router;
