import { Router } from "express";
import { z } from "zod";
import * as courseController from "../controllers/courseController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const router = Router();

const getCourseSessionsSchema = z.object({
    acedmicYearId: z.string().regex(/^\d+$/, "Academic Year Id must be a number").optional().transform(val => val ? parseInt(val) : undefined),
});

const listCoursesSchema = z.object({
    instituteId: z.string().regex(/^\d+$/, "Institute Id must be a number").optional().transform(val => val ? parseInt(val) : undefined),
    campusId: z.string().regex(/^\d+$/, "Campus Id must be a number").optional().transform(val => val ? parseInt(val) : undefined),
}).refine(data => !(data.instituteId && data.campusId), {
    message: "Only one of instituteId or campusId can be provided",
    path: ["instituteId"]
});

// Routes
router.get("/", userAuth, validate({ query: listCoursesSchema }), courseController.listCourses);

router.get("/:courseId/sessions", userAuth, validate({ query: getCourseSessionsSchema }), courseController.getCourseSessions);

export default router;
