import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utility/validation.js';
import {
    teacherSubjectMapping,
    teacherSectionMapping,
    getTeacherSubjectMapping,
    getTeacherSectionMapping,
    updateTeacherSubjectMapping,
    updateTeacherSectionMapping,
    deleteTeacherSubjectMapping,
    deleteTeacherSectionMapping,
} from '../controllers/teacherMappingController.js';
import userAuth from '../middleware/authUser.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const getTeacherSectionQuerySchema = z.object({
    userId: positiveIntegerId.optional(),
    sessionId: positiveIntegerId.optional(),
    search: z.string().trim().optional(),
    page: z.coerce
        .number()
        .int('page must be an integer')
        .min(1, 'page must be at least 1')
        .optional()
        .default(1),
    limit: z.coerce
        .number()
        .int('limit must be an integer')
        .min(1, 'limit must be at least 1')
        .max(100, 'limit must be at most 100')
        .optional()
        .default(20),
});

const getTeacherSubjectQuerySchema = z.object({
    userId: positiveIntegerId.optional(),
    subjectId: positiveIntegerId.optional(),
    sessionId: positiveIntegerId.optional(),
    search: z.string().trim().optional(),
    page: z.coerce
        .number()
        .int('page must be an integer')
        .min(1, 'page must be at least 1')
        .optional()
        .default(1),
    limit: z.coerce
        .number()
        .int('limit must be an integer')
        .min(1, 'limit must be at least 1')
        .max(100, 'limit must be at most 100')
        .optional()
        .default(20),
});

const idOrNonEmptyIdArray = z
    .union([
        z.array(positiveIntegerId).min(1),
        positiveIntegerId,
    ])
    .transform((val) => (Array.isArray(val) ? val : [val]));

const createTeacherSubjectSchema = z.object({
    userId: positiveIntegerId,
    subjectId: idOrNonEmptyIdArray,
    instituteId: positiveIntegerId.optional(),
    campusId: positiveIntegerId.optional(),
});

const createTeacherSectionSchema = z.object({
    userId: positiveIntegerId,
    classSectionsId: idOrNonEmptyIdArray,
});

const teacherSubjectMappingItemSchema = z.object({
    teacherSubjectMappingId: positiveIntegerId.optional(),
    userId: positiveIntegerId,
    subjectId: positiveIntegerId,
});

const updateTeacherSubjectSchema = z.object({
    data: z.array(teacherSubjectMappingItemSchema).min(1, 'data must be a non-empty array'),
    instituteId: positiveIntegerId.optional(),
});

const updateTeacherSectionSchema = z.object({
    teacherSectionMappingId: positiveIntegerId,
    userId: positiveIntegerId,
    classSectionsId: idOrNonEmptyIdArray,
});

const teacherSubjectMappingIdParamSchema = z.object({
    teacherSubjectMappingId: positiveIntegerId,
});

const teacherSectionMappingIdParamSchema = z.object({
    teacherSectionMappingId: positiveIntegerId,
});

router.post('/teacherSubject', userAuth, checkAccess(PERMISSIONS.TEACHER_MAPPED_SUBJECTS_ASSIGN.value, null), validate({ body: createTeacherSubjectSchema }), teacherSubjectMapping);

router.post('/teacherSection', userAuth, checkAccess(PERMISSIONS.TEACHER_MAPPED_CLASSES_ASSIGN.value, null), validate({ body: createTeacherSectionSchema }), teacherSectionMapping);

router.get('/teacherSubject', userAuth, checkAccess(PERMISSIONS.TEACHER_MAPPED_SUBJECTS.value, null), validate({ query: getTeacherSubjectQuerySchema }), getTeacherSubjectMapping);

// router.get('/teacherSubject/employee',userAuth , getTeacherSubjectMappingByEmployee);

router.get('/teacherSection', userAuth, checkAccess(PERMISSIONS.TEACHER_MAPPED_CLASSES.value, null), validate({ query: getTeacherSectionQuerySchema }), getTeacherSectionMapping);

router.patch('/teacherSubject', userAuth, checkAccess(PERMISSIONS.TEACHER_MAPPED_SUBJECTS_ASSIGN.value, null), validate({ body: updateTeacherSubjectSchema }), updateTeacherSubjectMapping);

router.patch('/teacherSection', userAuth, checkAccess(PERMISSIONS.TEACHER_MAPPED_CLASSES_ASSIGN.value, null), validate({ body: updateTeacherSectionSchema }), updateTeacherSectionMapping);

router.delete(
    '/teacherSubject/:teacherSubjectMappingId',
    userAuth,
    checkAccess(PERMISSIONS.TEACHER_MAPPED_SUBJECTS_UNASSIGN.value, null),
    validate({ params: teacherSubjectMappingIdParamSchema }),
    deleteTeacherSubjectMapping,
);

router.delete(
    '/teacherSection/:teacherSectionMappingId',
    userAuth,
    checkAccess(PERMISSIONS.TEACHER_MAPPED_CLASSES_UNASSIGN.value, null),
    validate({ params: teacherSectionMappingIdParamSchema }),
    deleteTeacherSectionMapping,
);

export default router;