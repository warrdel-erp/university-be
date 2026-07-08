import { Router } from "express";
import { z } from "zod";
import * as specializationController from "../controllers/specializationController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const updateSpecializationSchema = z
  .object({
    specializationId: z.number({ required_error: "Specialization Id is required" }),
    specializationName: z.string().min(1).optional(),
    specializationCode: z.string().min(1).optional(),
    course_Id: z.number().optional(),
  })
  .refine(
    (body) =>
      body.specializationName !== undefined ||
      body.specializationCode !== undefined ||
      body.course_Id !== undefined,
    { message: "At least one field to update is required" }
  );

router.patch(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.MASTER_SECTION_EDIT.value, "specialization"),
  validate({ body: updateSpecializationSchema }),
  specializationController.updateSpecialization
);

export default router;
