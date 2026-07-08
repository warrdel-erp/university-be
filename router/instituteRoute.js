import { Router } from "express";
import { z } from "zod";
import * as instituteController from "../controllers/instituteController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const academicYearSchema = z.object({
  yearTitle: z
    .string({ required_error: "yearTitle is required" })
    .min(1, "yearTitle cannot be empty"),
  startingDate: z
    .string({ required_error: "startingDate is required" })
    .min(1, "startingDate cannot be empty"),
  endingDate: z
    .string({ required_error: "endingDate is required" })
    .min(1, "endingDate cannot be empty"),
});

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
  academicYear: academicYearSchema,
  affiliatedUniversity: z
    .array(
      z.object({
        affiliatedUniversityName: z
          .string({ required_error: "Affiliated university name is required" })
          .min(1, "Affiliated university name cannot be empty"),
        affiliatedUniversityCode: z
          .string({ required_error: "Affiliated university code is required" })
          .min(1, "Affiliated university code cannot be empty"),
      })
    )
    .optional()
    .default([]),
});

const listInstituteSchema = z.object({
  campusId: z
    .string()
    .regex(/^\d+$/, "Campus Id must be a number")
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
});

const updateInstituteSchema = z
  .object({
    instituteId: z.number({ required_error: "Institute Id is required" }),
    campusId: z.number().optional(),
    instituteName: z.string().min(1).optional(),
    instituteCode: z.string().min(1).optional(),
  })
  .refine(
    (body) =>
      body.campusId !== undefined ||
      body.instituteName !== undefined ||
      body.instituteCode !== undefined,
    { message: "At least one field to update is required" }
  );

const updateAffiliatedUniversitySchema = z
  .object({
    affiliatedUniversityId: z.number({ required_error: "Affiliated university Id is required" }),
    affiliatedUniversityName: z.string().min(1).optional(),
    affiliatedUniversityCode: z.string().min(1).optional(),
  })
  .refine(
    (body) =>
      body.affiliatedUniversityName !== undefined ||
      body.affiliatedUniversityCode !== undefined,
    { message: "At least one field to update is required" }
  );

router.post("/", userAuth, checkAccess(PERMISSIONS.MASTER_SECTION_ADD.value, "institute"), validate({ body: instituteSchema }), instituteController.createInstitute);

router.patch("/", userAuth, checkAccess(PERMISSIONS.MASTER_SECTION_EDIT.value, "institute"), validate({ body: updateInstituteSchema }), instituteController.updateInstitute);
router.patch(
  "/affiliatedUniversity",
  userAuth,
  checkAccess(PERMISSIONS.MASTER_SECTION_EDIT.value, "institute"),
  validate({ body: updateAffiliatedUniversitySchema }),
  instituteController.updateAffiliatedUniversity
);
router.get("/", userAuth, validate({ query: listInstituteSchema }), instituteController.listInstitutes);

export default router;
