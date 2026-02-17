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

const courseListWithSubjectsSchema = z.object({
    instituteId: z.string().regex(/^\d+$/, "Institute Id must be a number").transform(val => parseInt(val)),
    acedmicYearId: z.string().regex(/^\d+$/, "Academic Year Id must be a number").transform(val => parseInt(val)),
});

const classSectionsGroupedSchema = z.object({
    courseId: z.string().regex(/^\d+$/, "Course Id must be a number").transform(val => parseInt(val)),
    sessionId: z.string().regex(/^\d+$/, "Session Id must be a number").transform(val => parseInt(val)),
});

// Routes
router.get("/", userAuth, validate({ query: listCoursesSchema }), courseController.listCourses);

router.get("/withSubjects", userAuth, validate({ query: courseListWithSubjectsSchema }), courseController.getCourseWithSubjects);

router.get("/semesterWithClassSections", userAuth, validate({ query: classSectionsGroupedSchema }), courseController.getClassSectionsGrouped);

router.get("/:courseId/sessions", userAuth, validate({ query: getCourseSessionsSchema }), courseController.getCourseSessions);

export default router;
