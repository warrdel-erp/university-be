import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import userAuth from "../middleware/authUser.js";
import {
  getAllCurriculumElectiveAssignments,
  getCurriculumElectiveAssignmentById,
  assignStudent,
  bulkAssignStudents,
  unassignStudent,
  bulkUnassignStudents,
} from "../controllers/curriculumElectiveAssignmentController.js";

const router = Router();

const positiveIntegerId = z.coerce
  .number({ invalid_type_error: "id must be a number" })
  .int({ message: "id must be an integer" })
  .positive({ message: "id must be positive" });

const listQuerySchema = z
  .object({
    curriculumElectiveRequirementId: positiveIntegerId.optional(),
    curriculum_elective_requirement_id: positiveIntegerId.optional(),
    requirementId: positiveIntegerId.optional(),
    id: positiveIntegerId.optional(),
    curriculumId: positiveIntegerId.optional(),
    term: positiveIntegerId.optional(),
    subjectId: positiveIntegerId.optional(),
    subject_id: positiveIntegerId.optional(),
    studentId: positiveIntegerId.optional(),
    student_id: positiveIntegerId.optional(),
    status: z.string().optional(),
    assignmentSource: z.string().optional(),
    search: z.string().optional(),
    studentSearch: z.string().optional(),
    q: z.string().optional(),
    batchId: positiveIntegerId.optional(),
    courseId: positiveIntegerId.optional(),
    programmeId: positiveIntegerId.optional(),
    section: z.string().optional(),
    classSectionsId: positiveIntegerId.optional(),
    academicYearId: positiveIntegerId.optional(),
    instituteId: positiveIntegerId.optional(),
    universityId: positiveIntegerId.optional(),
    limit: z.union([z.coerce.number(), z.string()]).optional(),
    page: z.coerce.number().int().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.string().optional(),
  })
  .passthrough();

const idParamSchema = z.object({
  id: positiveIntegerId,
});

const reqStudentParamSchema = z.object({
  curriculumElectiveRequirementId: positiveIntegerId,
  studentId: positiveIntegerId,
});

const assignBodySchema = z
  .object({
    curriculumElectiveRequirementId: positiveIntegerId.optional(),
    curriculum_elective_requirement_id: positiveIntegerId.optional(),
    requirementId: positiveIntegerId.optional(),
    studentId: positiveIntegerId.optional(),
    student_id: positiveIntegerId.optional(),
    subjectId: positiveIntegerId.optional(),
    subject_id: positiveIntegerId.optional(),
    assignmentSource: z.enum(["Direct", "Selection Round"]).optional(),
    status: z.enum(["Assigned", "Awaiting", "Dropped"]).optional(),
  })
  .passthrough();

const bulkAssignBodySchema = z
  .object({
    curriculumElectiveRequirementId: positiveIntegerId.optional(),
    curriculum_elective_requirement_id: positiveIntegerId.optional(),
    requirementId: positiveIntegerId.optional(),
    studentIds: z.array(positiveIntegerId).min(1, "studentIds cannot be empty"),
    subjectId: positiveIntegerId,
    assignmentSource: z.enum(["Direct", "Selection Round"]).optional(),
  })
  .passthrough();

const bulkUnassignBodySchema = z
  .object({
    curriculumElectiveRequirementId: positiveIntegerId.optional(),
    curriculum_elective_requirement_id: positiveIntegerId.optional(),
    requirementId: positiveIntegerId.optional(),
    studentIds: z.array(positiveIntegerId).min(1, "studentIds cannot be empty"),
  })
  .passthrough();

// List assignments with filters
router.get(
  "/list",
  userAuth,
  validate({ query: listQuerySchema }),
  getAllCurriculumElectiveAssignments
);
router.get(
  "/",
  userAuth,
  validate({ query: listQuerySchema }),
  getAllCurriculumElectiveAssignments
);

// Assign student
router.post(
  "/assign",
  userAuth,
  validate({ body: assignBodySchema }),
  assignStudent
);
router.post(
  "/",
  userAuth,
  validate({ body: assignBodySchema }),
  assignStudent
);

// Bulk assign
router.post(
  "/bulk-assign",
  userAuth,
  validate({ body: bulkAssignBodySchema }),
  bulkAssignStudents
);

// Bulk unassign
router.post(
  "/bulk-unassign",
  userAuth,
  validate({ body: bulkUnassignBodySchema }),
  bulkUnassignStudents
);

// Unassign by requirement and student ID
router.delete(
  "/unassign/:curriculumElectiveRequirementId/:studentId",
  userAuth,
  validate({ params: reqStudentParamSchema }),
  unassignStudent
);
router.delete(
  "/:curriculumElectiveRequirementId/:studentId",
  userAuth,
  validate({ params: reqStudentParamSchema }),
  unassignStudent
);

// Single assignment by ID
router.get(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  getCurriculumElectiveAssignmentById
);

// Unassign by assignment ID
router.delete(
  "/unassign/:id",
  userAuth,
  validate({ params: idParamSchema }),
  unassignStudent
);
router.delete(
  "/:id",
  userAuth,
  validate({ params: idParamSchema }),
  unassignStudent
);

export default router;
