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

const classSectionsQuerySchema = z.object({
    courseId: positiveIntegerId,
    term: z.coerce
        .number({ required_error: 'term is required', invalid_type_error: 'term must be a number' })
        .int({ message: 'term must be an integer' })
        .positive({ message: 'term must be positive' }),
    sessionId: optionalPositiveIntegerId,
});

const specializationsQuerySchema = z.object({
    courseId: optionalPositiveIntegerId,
});

const subjectsQuerySchema = z.object({
    courseId: optionalPositiveIntegerId,
    term: optionalPositiveIntegerId,
    sessionId: optionalPositiveIntegerId,
});

const teachersQuerySchema = z.object({
    campusId: optionalPositiveIntegerId,
});

const feePlansQuerySchema = z.object({
    courseId: optionalPositiveIntegerId,
    sessionId: optionalPositiveIntegerId,
});

const topicsQuerySchema = z.object({
    lessonId: optionalPositiveIntegerId,
});

router.get('/affiliatedUniversity', userAuth, optionsController.getAffiliatedUniversityOptions);

router.get('/courses', userAuth, optionsController.getCourseOptions);

router.get(
    '/courseTerms',
    userAuth,
    validate({ query: courseTermsQuerySchema }),
    optionsController.getTermOptions,
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
    '/feePlans',
    userAuth,
    validate({ query: feePlansQuerySchema }),
    optionsController.getFeePlanOptions,
);

router.get(
    '/topics',
    userAuth,
    validate({ query: topicsQuerySchema }),
    optionsController.getTopicOptions,
);

export default router;
