import express from "express";
import {
  addJobType,
  getAllJobTypes,
  updateJobType,
  deleteJobType,
  getSingleJobType
} from "../controllers/jobSettingsController.js";import useAuth from "../middleware/authUser.js";
import { z } from "zod";
import { validate } from "../utility/validation.js";

const singleJobTypeQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

const router = express.Router();

router.post("/add",useAuth, addJobType);
router.get("/list",useAuth, getAllJobTypes);
router.get("/:id",useAuth, validate({ query: singleJobTypeQuerySchema }), getSingleJobType);
router.patch("/update/:id",useAuth, updateJobType);
router.delete("/delete/:id",useAuth, deleteJobType);

export default router;