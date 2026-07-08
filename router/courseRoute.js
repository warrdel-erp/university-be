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

// Routes
router.get("/", userAuth, validate({ query: listCoursesSchema }), courseController.listCourses);

router.get("/withSubjects", userAuth, validate({ query: courseListWithSubjectsSchema }), courseController.getCourseWithSubjects);

router.get("/:courseId/sessions", userAuth, validate({ query: getCourseSessionsSchema }), courseController.getCourseSessions);


router.get("/termsWithClassSections", userAuth, validate({ query: classSectionsGroupedSchema }), courseController.getTermsWithClassSections);

router.get("/:courseId/terms", userAuth, courseController.getTermOptionsByCourse);

router.delete("/:courseId", userAuth, checkAccess(PERMISSIONS.COURSES_DELETE.value, 'institute'), validate({ params: courseIdParamSchema }), courseController.deleteCourse);

export default router;
