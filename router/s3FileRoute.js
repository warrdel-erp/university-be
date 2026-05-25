import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import {
  requestUploadUrl,
  confirmUpload,
} from "../controllers/s3FileController.js";

const router = Router();

// Zod schema for signed URL request validation
const requestUploadUrlSchema = z.object({
  entityType: z
    .string({ required_error: "entityType is required" })
    .min(1, "entityType cannot be empty"),
  entityId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val !== undefined ? String(val) : undefined)),
  fileName: z
    .string({ required_error: "fileName is required" })
    .min(1, "fileName cannot be empty"),
  fileSize: z
    .number({ required_error: "fileSize is required" })
    .int("fileSize must be an integer")
    .positive("fileSize must be positive"),
  mimeType: z
    .string({ required_error: "mimeType is required" })
    .min(1, "mimeType cannot be empty"),
  companyId: z
    .coerce
    .number()
    .int("companyId must be an integer")
    .positive("companyId must be a positive number")
    .optional(),
});

// Zod schema for upload confirmation validation
const confirmUploadSchema = z.object({
  fileUploadId: z
    .string({ required_error: "fileUploadId is required" })
    .uuid("fileUploadId must be a valid UUID"),
});

// Authenticated route to request S3 signed URL
router.post(
  "/request-url",
  userAuth,
  validate({ body: requestUploadUrlSchema }),
  requestUploadUrl
);

// Authenticated route to confirm successful upload
router.post(
  "/confirm",
  userAuth,
  validate({ body: confirmUploadSchema }),
  confirmUpload
);



export default router;
