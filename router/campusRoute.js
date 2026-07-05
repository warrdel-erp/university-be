import { Router } from "express";
import { z } from "zod";
import * as campusController from "../controllers/campusController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const campusTypeSchema = z.enum(["Main", "Regional", "Satellite"], {
  required_error: "Campus type is required",
  invalid_type_error: "Campus type must be Main, Regional, or Satellite",
});

const geoTagSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
  })
  .optional()
  .nullable();

const addressSchema = z.object({
  addressLine: z
    .string({ required_error: "Address line is required" })
    .min(1, "Address line cannot be empty"),
  geoTag: geoTagSchema,
});

const campusAdministratorSchema = z.object({
  name: z
    .string({ required_error: "Campus administrator name is required" })
    .min(1, "Campus administrator name cannot be empty"),
  contactNumber: z
    .string({ required_error: "Campus administrator contact number is required" })
    .min(1, "Campus administrator contact number cannot be empty"),
  email: z
    .string({ required_error: "Campus administrator email is required" })
    .email("Campus administrator email must be valid"),
});

const campusItemSchema = z.object({
  campusName: z
    .string({ required_error: "Campus name is required" })
    .min(1, "Campus name cannot be empty"),
  campusCode: z
    .string({ required_error: "Campus code is required" })
    .min(1, "Campus code cannot be empty"),
  campusType: campusTypeSchema,
  address: addressSchema,
  campusAdministrator: campusAdministratorSchema,
});


const updateAddressSchema = z.object({
  addressLine: z.string().min(1).optional(),
  geoTag: geoTagSchema,
});

const updateCampusAdministratorSchema = z.object({
  name: z.string().min(1).optional(),
  contactNumber: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const updateCampusSchema = z
  .object({
    campusId: z.number({ required_error: "Campus Id is required" }),
    campusName: z.string().min(1).optional(),
    campusCode: z.string().min(1).optional(),
    campusType: campusTypeSchema.optional(),
    address: updateAddressSchema.optional(),
    campusAdministrator: updateCampusAdministratorSchema.optional(),
  })
  .refine(
    (body) =>
      body.campusName !== undefined ||
      body.campusCode !== undefined ||
      body.campusType !== undefined ||
      body.address !== undefined ||
      body.campusAdministrator !== undefined,
    { message: "At least one field to update is required" }
  );

router.post("/", userAuth, checkAccess(PERMISSIONS.MASTER_SECTION_ADD.value, 'campus'), validate({ body: campusItemSchema }), campusController.createCampus);
router.patch("/", userAuth, checkAccess(PERMISSIONS.MASTER_SECTION_EDIT.value, 'campus'), validate({ body: updateCampusSchema }), campusController.updateCampus);
router.get("/hierarchy", userAuth, campusController.getCampusHierarchy);
router.get("/", userAuth, campusController.listCampuses);

export default router;
