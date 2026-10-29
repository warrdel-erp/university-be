import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  addSubjectComponent,
  getAllSubjectComponents,
  getSubjectComponentById,
  updateSubjectComponent,
  deleteSubjectComponent,
  assignComponentsToSubject,
  getComponentsForSubject,
  unmapComponentFromSubject,
} from "../controllers/subjectComponentController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const addSubjectComponentSchema = z
  .object({
    componentName: z.string().trim().min(1, "componentName is required").max(150).optional(),
    component_name: z.string().trim().min(1).max(150).optional(),
    name: z.string().trim().min(1).max(150).optional(),
    code: z.string().trim().min(1, "code is required").max(20),
    description: z.string().trim().max(250).optional().nullable(),
  })
  .refine(
    (data) =>
      data.componentName !== undefined ||
      data.component_name !== undefined ||
      data.name !== undefined,
    {
      message: "componentName (or component_name) is required",
      path: ["componentName"],
    }
  );

const updateSubjectComponentSchema = z
  .object({
    id: positiveIntegerId.optional(),
    subjectComponentId: positiveIntegerId.optional(),
    componentName: z.string().trim().min(1).max(150).optional(),
    component_name: z.string().trim().min(1).max(150).optional(),
    name: z.string().trim().min(1).max(150).optional(),
    code: z.string().trim().min(1).max(20).optional(),
    description: z.string().trim().max(250).optional().nullable(),
  })
  .refine(
    (data) =>
      data.componentName !== undefined ||
      data.component_name !== undefined ||
      data.name !== undefined ||
      data.code !== undefined ||
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
    subjectComponentId: positiveIntegerId.optional(),
    force: z.union([z.boolean(), z.string()]).optional(),
  })
  .refine((data) => data.id !== undefined || data.subjectComponentId !== undefined, {
    message: "id or subjectComponentId query parameter is required",
  });

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const mapSubjectSchema = z.object({
  subjectId: positiveIntegerId.optional(),
  componentIds: z.array(positiveIntegerId),
});

const subjectIdParamSchema = z.object({
  subjectId: positiveIntegerId,
});

const unmapParamSchema = z.object({
  subjectId: positiveIntegerId,
  componentId: positiveIntegerId,
});

// Create
router.post(
  "/",
  userAuth,
  validate({ body: addSubjectComponentSchema }),
  addSubjectComponent
);

// List / search / paginate
router.get(
  "/",
  userAuth,
  validate({ query: listQuerySchema }),
  getAllSubjectComponents
);

// Mapping routes
router.post(
  "/map",
  userAuth,
  validate({ body: mapSubjectSchema }),
  assignComponentsToSubject
);
router.post(
  "/subject/:subjectId",
  userAuth,
  validate({ params: subjectIdParamSchema, body: z.object({ componentIds: z.array(positiveIntegerId) }) }),
  assignComponentsToSubject
);
router.get(
  "/subject/:subjectId",
  userAuth,
  validate({ params: subjectIdParamSchema }),
  getComponentsForSubject
);
router.delete(
  "/subject/:subjectId/component/:componentId",
  userAuth,
  validate({ params: unmapParamSchema }),
  unmapComponentFromSubject
);

// Single view via query (?id=)
router.get(
  "/single",
  userAuth,
  validate({ query: idQuerySchema }),
  getSubjectComponentById
);

// Single view via param (/:id)
router.get(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getSubjectComponentById
);

// Update via param (/:id)
router.patch(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updateSubjectComponentSchema }),
  updateSubjectComponent
);
router.put(
  "/:id",
  userAuth,
  validate({ params: idParamSchema, body: updateSubjectComponentSchema }),
  updateSubjectComponent
);

// Update via body
router.patch(
  "/",
  userAuth,
  validate({ body: updateSubjectComponentSchema }),
  updateSubjectComponent
);

// Delete via param (/:id)
router.delete(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  deleteSubjectComponent
);

// Delete via query
router.delete(
  "/",
  userAuth,
  validate({ query: idQuerySchema }),
  deleteSubjectComponent
);

export default router;

