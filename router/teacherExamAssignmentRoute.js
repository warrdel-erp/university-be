import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
  assignTeacherToExam,
  getAllExamAssignments,
  removeTeacherFromExam,
  getMyExamAssignments,
} from "../controllers/teacherExamAssignmentController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const assignmentSchema = z.object({
  deadline: z.string({ required_error: "deadline is required" }),
  examScheduleId: z.number({ required_error: "examScheduleId is required" }),
  userId: z.number({ required_error: "userId is required" }),
});

const assignmentParamsSchema = z.object({
  teacherExamAssignmentId: z
    .string()
    .regex(/^\d+$/, "teacherExamAssignmentId must be a number")
    .transform((val) => parseInt(val)),
});

router.post(
  "/",
  userAuth,
  checkAccess(
    PERMISSIONS.EXAM_ASSIGN_TEACHER_ADD.value,
    "teacherExamAssignment",
  ),
  validate({ body: assignmentSchema }),
  assignTeacherToExam,
);
router.get("/my", userAuth, getMyExamAssignments);
router.get(
  "/",
  userAuth,
  checkAccess(PERMISSIONS.EXAM_ASSIGN_TEACHER.value, "teacherExamAssignment"),
  getAllExamAssignments,
);

router.delete(
  "/:teacherExamAssignmentId",
  userAuth,
  checkAccess(
    PERMISSIONS.EXAM_ASSIGN_TEACHER_DELETE.value,
    "teacherExamAssignment",
  ),
  validate({ params: assignmentParamsSchema }),
  removeTeacherFromExam,
);

export default router;
