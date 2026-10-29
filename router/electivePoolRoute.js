import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  addElectivePool,
  getAllElectivePools,
  getElectivePoolById,
  updateElectivePool,
  toggleStatusElectivePool,
  deleteElectivePool,
} from "../controllers/electivePoolController.js";
import {
  getAvailableSubjects,
  mapSubjectsToPool,
  unmapSubjectFromPool,
  getMappedSubjectsForPool,
} from "../controllers/electivePoolSubjectMappingController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const createPoolSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(150),
  code: z.string().trim().min(1, "code is required").max(50),
  description: z.string().trim().max(300).optional().nullable(),
  scope: z.enum(["institute", "programme", "batch"]).default("programme").optional(),
  courseId: positiveIntegerId.optional().nullable(),
  programmeId: positiveIntegerId.optional().nullable(),
  batchId: positiveIntegerId.optional().nullable(),
  instituteId: positiveIntegerId.optional(),
  isActive: z.boolean().optional(),
});

const updatePoolSchema = z.object({
  id: positiveIntegerId.optional(),
  electivePoolId: positiveIntegerId.optional(),
  name: z.string().trim().min(1).max(150).optional(),
  code: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  scope: z.enum(["institute", "programme", "batch"]).optional(),
  courseId: positiveIntegerId.optional().nullable(),
  programmeId: positiveIntegerId.optional().nullable(),
  batchId: positiveIntegerId.optional().nullable(),
  instituteId: positiveIntegerId.optional(),
  isActive: z.boolean().optional(),
});

const mapSubjectsSchema = z.object({
  electivePoolId: positiveIntegerId.optional(),
  poolId: positiveIntegerId.optional(),
  subjectIds: z.array(positiveIntegerId).min(1, "At least one subjectId is required"),
}).refine((d) => d.electivePoolId !== undefined || d.poolId !== undefined, {
  message: "electivePoolId is required",
  path: ["electivePoolId"],
});

const unmapSubjectSchema = z.object({
  electivePoolId: positiveIntegerId.optional(),
  poolId: positiveIntegerId.optional(),
  subjectId: positiveIntegerId,
}).refine((d) => d.electivePoolId !== undefined || d.poolId !== undefined, {
  message: "electivePoolId is required",
  path: ["electivePoolId"],
});

const idParamSchema = z.object({
  id: positiveIntegerId,
});

const poolIdParamSchema = z.object({
  poolId: positiveIntegerId,
});

// ==========================================
// 1. SUBJECT MAPPING ROUTES (Must come before /:id)
// ==========================================

// Image 2: Get Course Master list with filters and "Already in Pool" / "Available" status
router.get("/subjects/available", userAuth, getAvailableSubjects);

// Image 2: "Add Courses" button - bulk map subjects to pool
router.post(
  "/subjects/map",
  userAuth,
  validate({ body: mapSubjectsSchema }),
  mapSubjectsToPool
);

// Image 2: Remove a course from pool
router.delete(
  "/subjects/unmap",
  userAuth,
  validate({ body: unmapSubjectSchema }),
  unmapSubjectFromPool
);

// Get all mapped courses in a pool
router.get(
  "/subjects/mapped/:poolId",
  userAuth,
  validate({ params: poolIdParamSchema }),
  getMappedSubjectsForPool
);

// ==========================================
// 2. ELECTIVE POOL CRUD ROUTES
// ==========================================

// Create
router.post(
  "/create",
  userAuth,
  validate({ body: createPoolSchema }),
  addElectivePool
);
router.post(
  "/",
  userAuth,
  validate({ body: createPoolSchema }),
  addElectivePool
);

// List
router.get("/list", userAuth, getAllElectivePools);
router.get("/", userAuth, getAllElectivePools);

// Single view via param
router.get("/:id", userAuth, validate({ params: idParamSchema }), getElectivePoolById);

// Update via param
router.patch(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updatePoolSchema }),
  updateElectivePool
);
router.put(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updatePoolSchema }),
  updateElectivePool
);

// Update via explicit /update/:id
router.patch(
  "/update/:id",
  userAuth,
  validate({ params: idParamSchema, body: updatePoolSchema }),
  updateElectivePool
);

// Toggle status (Active / Inactive)
router.patch(
  "/toggleStatus/:id",
  userAuth,
  validate({ params: idParamSchema }),
  toggleStatusElectivePool
);

// Delete (Soft delete)
router.delete(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  deleteElectivePool
);
router.delete(
  "/delete/:id",
  userAuth,
  validate({ params: idParamSchema }),
  deleteElectivePool
);

export default router;

