import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
    assignTeacherToExam,
    getAllExamAssignments,
    removeTeacherFromExam
} from "../controllers/teacherExamAssignmentController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const assignmentSchema = z.object({
    deadline: z.string({ required_error: "deadline is required" }),
    examScheduleId: z.number({ required_error: "examScheduleId is required" }),
    employeeId: z.number({ required_error: "employeeId is required" })
});

const assignmentParamsSchema = z.object({
    teacherExamAssignmentId: z.string().regex(/^\d+$/, "teacherExamAssignmentId must be a number").transform(val => parseInt(val))
});

router.post("/", userAuth, validate({ body: assignmentSchema }), assignTeacherToExam);

router.get("/", userAuth, getAllExamAssignments);

router.delete("/:teacherExamAssignmentId", userAuth, validate({ params: assignmentParamsSchema }), removeTeacherFromExam);

export default router;
