import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  addCurriculumCategory,
  getAllCurriculumCategories,
  getCurriculumCategoryById,
  updateCurriculumCategory,
  deleteCurriculumCategory,
} from "../controllers/curriculumCategoryController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const addCurriculumCategorySchema = z
  .object({
    categoryName: z.string().trim().min(1, "categoryName is required").max(150).optional(),
    category_name: z.string().trim().min(1).max(150).optional(),
    code: z.string().trim().min(1, "code is required").max(20),
    isElectiveCoursework: z.boolean().optional(),
    is_elective_coursework: z.boolean().optional(),
    description: z.string().trim().max(250).optional().nullable(),
  })
  .refine((data) => data.categoryName !== undefined || data.category_name !== undefined, {
    message: "categoryName (or category_name) is required",
    path: ["categoryName"],
  });

const updateCurriculumCategorySchema = z
  .object({
    id: positiveIntegerId.optional(),
    curriculumCategoryId: positiveIntegerId.optional(),
    categoryName: z.string().trim().min(1).max(150).optional(),
    category_name: z.string().trim().min(1).max(150).optional(),
    code: z.string().trim().min(1).max(20).optional(),
    isElectiveCoursework: z.boolean().optional(),
    is_elective_coursework: z.boolean().optional(),
    description: z.string().trim().max(250).optional().nullable(),
  })
  .refine(
    (data) =>
      data.categoryName !== undefined ||
      data.category_name !== undefined ||
      data.code !== undefined ||
      data.isElectiveCoursework !== undefined ||
      data.is_elective_coursework !== undefined ||
      data.description !== undefined,
    {
      message: "At least one field to update is required",
    }
  );

const idParamSchema = z.object({
  id: positiveIntegerId,
});

const idQuerySchema = z
  .object({
    id: positiveIntegerId.optional(),
    curriculumCategoryId: positiveIntegerId.optional(),
  })
  .refine((data) => data.id !== undefined || data.curriculumCategoryId !== undefined, {
    message: "id or curriculumCategoryId query parameter is required",
  });

const listQuerySchema = z.object({
  search: z.string().optional(),
  isElectiveCoursework: z.union([z.boolean(), z.string()]).optional(),
  is_elective_coursework: z.union([z.boolean(), z.string()]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

// Create
router.post(
  "/",
  userAuth,
  validate({ body: addCurriculumCategorySchema }),
  addCurriculumCategory
);

// List all or search/paginate
router.get(
  "/",
  userAuth,
  validate({ query: listQuerySchema }),
  getAllCurriculumCategories
);

// Get single via query (?id=1 or ?curriculumCategoryId=1)
router.get(
  "/single",
  userAuth,
  validate({ query: idQuerySchema }),
  getCurriculumCategoryById
);

// Get single via param (/:id)
router.get(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumCategoryById
);

// Update via param (/:id)
router.patch(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updateCurriculumCategorySchema }),
  updateCurriculumCategory
);
router.put(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updateCurriculumCategorySchema }),
  updateCurriculumCategory
);

// Update via body (/)
router.patch(
  "/",
  userAuth,
  validate({ body: updateCurriculumCategorySchema }),
  updateCurriculumCategory
);

// Delete via param (/:id)
router.delete(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  deleteCurriculumCategory
);

// Delete via query (/)
router.delete(
  "/",
  userAuth,
  validate({ query: idQuerySchema }),
  deleteCurriculumCategory
);

export default router;

