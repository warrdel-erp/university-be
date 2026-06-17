import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addAmcVendor,
  getAllAmcVendor,
  getSingleAmcVendorDetails,
  updateAmcVendor,
  deleteAmcVendor,
  previewAmcVendorCode,
} from "../controllers/amcVendorController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const optionalTrimmedString = z.string().trim().optional().nullable();

const vendorAddressSchema = z
  .object({
    addressLine: optionalTrimmedString,
    city: optionalTrimmedString,
    state: optionalTrimmedString,
    country: optionalTrimmedString,
    pincode: optionalTrimmedString,
  })
  .optional();

const amcVendorIdQuerySchema = z.object({
  amcVendorId: positiveIntegerId,
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
});

const addAmcVendorSchema = z.object({
  vendorName: z.string().trim().min(1),
  assetCategoryId: positiveIntegerId,
  contactPerson: optionalTrimmedString,
  phone: optionalTrimmedString,
  email: optionalTrimmedString,
  address: vendorAddressSchema,
  gstNumber: optionalTrimmedString,
});

const updateAmcVendorSchema = z
  .object({
    amcVendorId: positiveIntegerId,
    vendorName: z.string().trim().min(1).optional(),
    assetCategoryId: positiveIntegerId.optional(),
    contactPerson: optionalTrimmedString,
    phone: optionalTrimmedString,
    email: optionalTrimmedString,
    address: vendorAddressSchema,
    gstNumber: optionalTrimmedString,
  })
  .refine(
    (d) =>
      d.vendorName !== undefined ||
      d.assetCategoryId !== undefined ||
      d.contactPerson !== undefined ||
      d.phone !== undefined ||
      d.email !== undefined ||
      d.address !== undefined ||
      d.gstNumber !== undefined,
    { message: "At least one field is required to update" }
  );

const codePreviewBodySchema = z.object({
  vendorName: z.string().trim().min(1),
  assetCategoryId: positiveIntegerId,
});

router.post("/", userAuth, validate({ body: addAmcVendorSchema }), addAmcVendor);
router.post(
  "/codepreview",
  userAuth,
  validate({ body: codePreviewBodySchema }),
  previewAmcVendorCode
);
router.get("/", userAuth, validate({ query: listQuerySchema }), getAllAmcVendor);
router.get(
  "/single",
  userAuth,
  validate({ query: amcVendorIdQuerySchema }),
  getSingleAmcVendorDetails
);
router.patch("/", userAuth, validate({ body: updateAmcVendorSchema }), updateAmcVendor);
router.delete(
  "/",
  userAuth,
  validate({ query: amcVendorIdQuerySchema }),
  deleteAmcVendor
);

export default router;
