import { Router } from "express";
import { z } from "zod";
import * as instituteController from "../controllers/instituteController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const router = Router();

// Define schema for institute creation
const instituteSchema = z.object({
  campusId: z.number({
    required_error: "Campus Id is required",
  }),
  instituteName: z
    .string({
      required_error: "Institute name is required",
    })
    .min(1, "Institute name cannot be empty"),
  instituteCode: z
    .string({
      required_error: "Institute code is required",
    })
    .min(1, "Institute code cannot be empty"),
});

// Define schema for listing institutes
const listInstituteSchema = z.object({
  campusId: z
    .string()
    .regex(/^\d+$/, "Campus Id must be a number")
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
});

// Routes
router.post("/", userAuth, validate({ body: instituteSchema }), instituteController.createInstitute);

router.get("/", userAuth, validate({ query: listInstituteSchema }), instituteController.listInstitutes);

export default router;
