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

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const getTeacherSectionQuerySchema = z.object({
    employeeId: positiveIntegerId.optional(),
    sessionId: positiveIntegerId.optional(),
    acedmicYearId: positiveIntegerId.optional(),
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
    employeeId: positiveIntegerId.optional(),
    subjectId: positiveIntegerId.optional(),
    sessionId: positiveIntegerId.optional(),
    acedmicYearId: positiveIntegerId.optional(),
});

router.post('/teacherSubject',userAuth , teacherSubjectMapping);

router.post('/teacherSection',userAuth , teacherSectionMapping);

router.get('/teacherSubject', userAuth, validate({ query: getTeacherSubjectQuerySchema }), getTeacherSubjectMapping);

// router.get('/teacherSubject/employee',userAuth , getTeacherSubjectMappingByEmployee);

router.get('/teacherSection', userAuth, validate({ query: getTeacherSectionQuerySchema }), getTeacherSectionMapping);

router.patch('/teacherSubject',userAuth , updateTeacherSubjectMapping);

router.patch('/teacherSection',userAuth , updateTeacherSectionMapping);

router.delete('/:teacherSubjectMappingId',userAuth , deleteTeacherSubjectMapping);

router.delete('/:teacherSectionMappingId',userAuth , deleteTeacherSectionMapping);

export default router;