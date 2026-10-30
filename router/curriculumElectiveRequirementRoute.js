import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  addCurriculumElectiveRequirement,
  getAllCurriculumElectiveRequirements,
  getCurriculumElectiveRequirementById,
  updateCurriculumElectiveRequirement,
  toggleStatusCurriculumElectiveRequirement,
  deleteCurriculumElectiveRequirement,
} from "../controllers/curriculumElectiveRequirementController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const createRequirementSchema = z.object({
  curriculumId: positiveIntegerId,
  term: positiveIntegerId,
  requirementCode: z.string().trim().min(1, "requirementCode is required").max(50),
  requirementName: z.string().trim().min(1, "requirementName is required").max(150),
  curriculumCategoryId: positiveIntegerId,
  courseCount: z.boolean().optional(),
  coursesRequired: positiveIntegerId.optional(),
  minCredits: z.number().nonnegative().optional().nullable(),
  electivePoolId: positiveIntegerId,
  isActive: z.boolean().optional(),
});

const updateRequirementSchema = z.object({
  id: positiveIntegerId.optional(),
  curriculumElectiveRequirementId: positiveIntegerId.optional(),
  term: positiveIntegerId.optional(),
  requirementCode: z.string().trim().min(1).max(50).optional(),
  requirementName: z.string().trim().min(1).max(150).optional(),
  curriculumCategoryId: positiveIntegerId.optional(),
  courseCount: z.boolean().optional(),
  coursesRequired: positiveIntegerId.optional(),
  minCredits: z.number().nonnegative().optional().nullable(),
  electivePoolId: positiveIntegerId.optional(),
  isActive: z.boolean().optional(),
});

const idParamSchema = z.object({
  id: positiveIntegerId,
});

// Create
router.post(
  "/create",
  userAuth,
  validate({ body: createRequirementSchema }),
  addCurriculumElectiveRequirement
);
router.post(
  "/",
  userAuth,
  validate({ body: createRequirementSchema }),
  addCurriculumElectiveRequirement
);

// List
router.get("/list", userAuth, getAllCurriculumElectiveRequirements);
router.get("/", userAuth, getAllCurriculumElectiveRequirements);

// Single view via param
router.get(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveRequirementById
);

// Update via param
router.patch(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updateRequirementSchema }),
  updateCurriculumElectiveRequirement
);
router.put(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updateRequirementSchema }),
  updateCurriculumElectiveRequirement
);

// Update via explicit /update/:id
router.patch(
  "/update/:id",
  userAuth,
  validate({ params: idParamSchema, body: updateRequirementSchema }),
  updateCurriculumElectiveRequirement
);

// Toggle status (Active / Inactive)
router.patch(
  "/toggleStatus/:id",
  userAuth,
  validate({ params: idParamSchema }),
  toggleStatusCurriculumElectiveRequirement
);

// Delete (Soft delete)
router.delete(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  deleteCurriculumElectiveRequirement
);
router.delete(
  "/delete/:id",
  userAuth,
  validate({ params: idParamSchema }),
  deleteCurriculumElectiveRequirement
);

export default router;

