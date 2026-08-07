import { Router } from "express";
import { z } from "zod";
import * as courseController from "../controllers/courseController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const getCourseSessionsSchema = z.object({});

const listCoursesSchema = z.object({
    instituteId: z.string().regex(/^\d+$/, "Institute Id must be a number").optional().transform(val => val ? parseInt(val) : undefined),
    campusId: z.string().regex(/^\d+$/, "Campus Id must be a number").optional().transform(val => val ? parseInt(val) : undefined),
});

const courseListWithSubjectsSchema = z.object({
    instituteId: z.string().regex(/^\d+$/, "Institute Id must be a number").transform(val => parseInt(val)),
});

const classSectionsGroupedSchema = z.object({
    courseId: z.string().regex(/^\d+$/, "Course Id must be a number").transform(val => parseInt(val)),
    sessionId: z.string().regex(/^\d+$/, "Session Id must be a number").transform(val => parseInt(val)),
});

const courseIdParamSchema = z.object({
    courseId: z.coerce.number().int().positive(),
});

const getSingleCourseQuerySchema = z.object({
    courseId: z.preprocess(
        (val) => (val === "" || val === null ? undefined : val),
        z.union([z.string().regex(/^\d+$/).transform(Number), z.number().int().positive({ message: "courseId is required" })])
    ),
});

// Routes
router.get("/", userAuth, checkAccess(PERMISSIONS.COURSES.value, null), validate({ query: listCoursesSchema }), courseController.listCourses);

router.get("/single", userAuth, checkAccess(PERMISSIONS.COURSES.value, null), validate({ query: getSingleCourseQuerySchema }), courseController.getSingleCourse);

router.get("/withSubjects", userAuth, checkAccess(PERMISSIONS.COURSES.value, null), validate({ query: courseListWithSubjectsSchema }), courseController.getCourseWithSubjects);

router.get("/:courseId/sessions", userAuth, checkAccess(PERMISSIONS.COURSES.value, null), validate({ query: getCourseSessionsSchema }), courseController.getCourseSessions);


router.get("/termsWithClassSections", userAuth, checkAccess(PERMISSIONS.COURSES.value, null), validate({ query: classSectionsGroupedSchema }), courseController.getTermsWithClassSections);

router.get("/:courseId/terms", userAuth, checkAccess(PERMISSIONS.COURSES.value, null), courseController.getTermOptionsByCourse);

router.delete("/:courseId", userAuth, checkAccess(PERMISSIONS.COURSES_DELETE.value, null), validate({ params: courseIdParamSchema }), courseController.deleteCourse);

export default router; 
