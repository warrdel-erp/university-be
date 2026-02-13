import { Router } from "express";
import { z } from "zod";
import * as campusController from "../controllers/campusController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const router = Router();

// Define schema for campus creation
const campusSchema = z.object({
  campusName: z
    .string({
      required_error: "Campus name is required",
    })
    .min(1, "Campus name cannot be empty"),
  campusCode: z
    .string({
      required_error: "Campus code is required",
    })
    .min(1, "Campus code cannot be empty"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// Routes
router.post("/", userAuth, validate({ body: campusSchema }), campusController.createCampus);

router.get("/", userAuth, campusController.listCampuses);

export default router;
