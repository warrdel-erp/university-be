import { Router } from 'express';
import { z } from 'zod';
import * as optionsController from '../controllers/optionsController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const emptyToUndefined = (val) =>
    val === '' || val === null || val === undefined ? undefined : val;

const positiveIntegerId = z.coerce
    .number({ invalid_type_error: 'id must be a number' })
    .int({ message: 'id must be an integer' })
    .positive({ message: 'id must be positive' });

const optionalPositiveIntegerId = z.preprocess(
    emptyToUndefined,
    positiveIntegerId.optional(),
);

const courseTermsQuerySchema = z.object({
    courseId: positiveIntegerId,
});

const courseProgramQuerySchema = z.object({
    courseId: positiveIntegerId,
});

const classSectionsQuerySchema = z.object({
    courseId: positiveIntegerId,
    term: optionalPositiveIntegerId,
    sessionId: optionalPositiveIntegerId,
    year: optionalPositiveIntegerId,
});

const coursesQuerySchema = z.object({
    courseLevelId: optionalPositiveIntegerId,
});

const specializationsQuerySchema = z.object({
    courseId: optionalPositiveIntegerId,
});

const subjectsQuerySchema = z.object({
    courseId: optionalPositiveIntegerId,
    term: optionalPositiveIntegerId,
    sessionId: optionalPositiveIntegerId,
    userId: optionalPositiveIntegerId,
});

const teachersQuerySchema = z.object({
    campusId: optionalPositiveIntegerId,
    subjectId: optionalPositiveIntegerId,
});

const feePlansQuerySchema = z.object({
    courseId: optionalPositiveIntegerId,
    sessionId: optionalPositiveIntegerId,
});

const topicsQuerySchema = z.object({
    lessonId: positiveIntegerId,
});

const lectureWindowsQuerySchema = z.object({
    userId: optionalPositiveIntegerId,
    employeeId: optionalPositiveIntegerId,
    subjectId: positiveIntegerId,
    date: z
        .string({ required_error: 'date is required' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    sessionId: optionalPositiveIntegerId,
}).refine(
    (data) => data.userId != null || data.employeeId != null,
    { message: 'userId or employeeId is required', path: ['userId'] },
);

const lessonsQuerySchema = z.object({
    lectureWindowId: positiveIntegerId,
});

router.get('/affiliatedUniversity', userAuth, optionsController.getAffiliatedUniversityOptions);

router.get(
    '/courses',
    userAuth,
    validate({ query: coursesQuerySchema }),
    optionsController.getCourseOptions,
);

router.get(
    '/courseTerms',
    userAuth,
    validate({ query: courseTermsQuerySchema }),
    optionsController.getTermOptions,
);

router.get(
    '/courseProgram',
    userAuth,
    validate({ query: courseProgramQuerySchema }),
    optionsController.getCourseProgramOptions,
);

router.get(
    '/classSections',
    userAuth,
    validate({ query: classSectionsQuerySchema }),
    optionsController.getClassSectionOptions,
);

router.get(
    '/specializations',
    userAuth,
    validate({ query: specializationsQuerySchema }),
    optionsController.getSpecializationOptions,
);

router.get(
    '/subjects',
    userAuth,
    validate({ query: subjectsQuerySchema }),
    optionsController.getSubjectOptions,
);

router.get(
    '/teachers',
    userAuth,
    validate({ query: teachersQuerySchema }),
    optionsController.getTeacherOptions,
);

router.get(
    '/structures',
    userAuth,
    optionsController.getTimeTableStructureOptions,
);

router.get(
    '/feePlans',
    userAuth,
    validate({ query: feePlansQuerySchema }),
    optionsController.getFeePlanOptions,
);

router.get(
    '/lectureWindows',
    userAuth,
    validate({ query: lectureWindowsQuerySchema }),
    optionsController.getLectureWindowOptions,
);

router.get(
    '/lessons',
    userAuth,
    validate({ query: lessonsQuerySchema }),
    optionsController.getLessonOptions,
);

router.get(
    '/topics',
    userAuth,
    validate({ query: topicsQuerySchema }),
    optionsController.getTopicOptions,
);

export default router;
