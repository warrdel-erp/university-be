import express from "express";
import { z } from "zod";
import useAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";
import {
  createAcademicRegulation,
  getAcademicRegulations,
  getAcademicRegulationById,
  updateAcademicRegulation,
  deleteAcademicRegulation,
} from "../controllers/academicRegulationController.js";

const router = express.Router();

export const createAcademicRegulationBody = z.object({
  regulationCode: z.string().min(1).max(50),
  regulationName: z.string().min(1).max(150),
  description: z.string().max(500).optional().nullable(),
  courseId: z.coerce.number().int().positive().optional().nullable(),
  academicYearRange: z.string().max(50).optional().nullable(),
  applicableBatch: z.string().max(50).optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveUntil: z.string().optional().nullable(),
  gradingSchemeId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("DRAFT"),
  isActive: z.boolean().optional().default(true),
});

export const updateAcademicRegulationBody = z.object({
  regulationCode: z.string().min(1).max(50).optional(),
  regulationName: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional().nullable(),
  courseId: z.coerce.number().int().positive().optional().nullable(),
  academicYearRange: z.string().max(50).optional().nullable(),
  applicableBatch: z.string().max(50).optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveUntil: z.string().optional().nullable(),
  gradingSchemeId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isActive: z.boolean().optional(),
});

export const listAcademicRegulationQuery = z.object({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  courseId: z.union([z.string(), z.number()]).optional(),
  academicYearId: z.union([z.string(), z.number()]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

router.post(
  "/",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_ADD.value, null),
  validate({ body: createAcademicRegulationBody }),
  createAcademicRegulation
);

router.get(
  "/:academicRegulationId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  getAcademicRegulationById
);

router.patch(
  "/:academicRegulationId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP_EDIT.value, null),
  validate({ body: updateAcademicRegulationBody }),
  updateAcademicRegulation
);

router.delete(
  "/:academicRegulationId",
  useAuth,
  checkAccess(PERMISSIONS.GRADING_SETUP.value, null),
  deleteAcademicRegulation
);

export default router;
