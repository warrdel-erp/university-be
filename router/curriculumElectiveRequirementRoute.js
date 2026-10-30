import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  addCurriculumElectiveRequirement,
  getAllCurriculumElectiveRequirements,
  getCurriculumElectiveRequirementById,
  getCurriculumElectiveRequirementOverview,
  getCurriculumElectiveRequirementCourseOfferings,
  getCurriculumElectiveRequirementAssignments,
  assignStudentToCurriculumElective,
  unassignStudentFromCurriculumElective,
  bulkAssignStudentsToCurriculumElective,
  bulkUnassignStudentsFromCurriculumElective,
  getCourseStudentsForManagement,
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

const assignStudentSchema = z.object({
  studentId: positiveIntegerId,
  subjectId: positiveIntegerId.optional(),
  subjectIds: z.array(positiveIntegerId).optional(),
  assignmentSource: z.enum(["Direct", "Selection Round"]).optional(),
  mode: z.enum(["replace", "append"]).optional(),
  allowOverflow: z.boolean().optional(),
}).refine(data => data.subjectId !== undefined || (Array.isArray(data.subjectIds) && data.subjectIds.length > 0), {
  message: "Either subjectId or subjectIds must be provided",
});

const bulkAssignSchema = z.object({
  studentIds: z.array(positiveIntegerId).nonempty("studentIds must contain at least one student"),
  subjectId: positiveIntegerId,
  assignmentSource: z.enum(["Direct", "Selection Round"]).optional(),
});

const unassignParamSchema = z.object({
  id: positiveIntegerId,
  studentId: positiveIntegerId,
});

const courseSubjectParamSchema = z.object({
  id: positiveIntegerId,
  subjectId: positiveIntegerId,
});

const bulkUnassignSchema = z.object({
  studentIds: z.array(positiveIntegerId).nonempty("studentIds must contain at least one student"),
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

// Course Offerings page for Elective Requirement (Image 1 Screen)
router.get(
  "/:id/course-offerings",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveRequirementCourseOfferings
);
router.get(
  "/course-offerings/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveRequirementCourseOfferings
);

// Overview page for Elective Requirement (Header, KPIs, Progress Bar, Requirement Card, Course Offerings table)
router.get(
  "/:id/overview",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveRequirementOverview
);
router.get(
  "/overview/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveRequirementOverview
);

// Assignments page for Elective Requirement (Image 3: Student-wise, Image 4: Course-wise)
router.get(
  "/:id/assignments",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveRequirementAssignments
);
router.get(
  "/assignments/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveRequirementAssignments
);

// Assign student to elective course
router.post(
  "/:id/assign",
  userAuth,
  validate({ params: idParamSchema, body: assignStudentSchema }),
  assignStudentToCurriculumElective
);
router.post(
  "/assign/:id",
  userAuth,
  validate({ params: idParamSchema, body: assignStudentSchema }),
  assignStudentToCurriculumElective
);

// Bulk assign students to elective course
router.post(
  "/:id/bulk-assign",
  userAuth,
  validate({ params: idParamSchema, body: bulkAssignSchema }),
  bulkAssignStudentsToCurriculumElective
);
router.post(
  "/bulk-assign/:id",
  userAuth,
  validate({ params: idParamSchema, body: bulkAssignSchema }),
  bulkAssignStudentsToCurriculumElective
);

// Unassign student from elective requirement
router.delete(
  "/:id/unassign/:studentId",
  userAuth,
  validate({ params: unassignParamSchema }),
  unassignStudentFromCurriculumElective
);
router.delete(
  "/unassign/:id/:studentId",
  userAuth,
  validate({ params: unassignParamSchema }),
  unassignStudentFromCurriculumElective
);
router.post(
  "/:id/unassign",
  userAuth,
  validate({ params: idParamSchema }),
  unassignStudentFromCurriculumElective
);

// Bulk unassign students from elective requirement
router.post(
  "/:id/bulk-unassign",
  userAuth,
  validate({ params: idParamSchema, body: bulkUnassignSchema }),
  bulkUnassignStudentsFromCurriculumElective
);
router.post(
  "/bulk-unassign/:id",
  userAuth,
  validate({ params: idParamSchema, body: bulkUnassignSchema }),
  bulkUnassignStudentsFromCurriculumElective
);

// Course Students Management (For Image 4 "Manage Students ->" action on course row)
router.get(
  "/:id/course-students/:subjectId",
  userAuth,
  validate({ params: courseSubjectParamSchema }),
  getCourseStudentsForManagement
);
router.get(
  "/course-students/:id/:subjectId",
  userAuth,
  validate({ params: courseSubjectParamSchema }),
  getCourseStudentsForManagement
);

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

