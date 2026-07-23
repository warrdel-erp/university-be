import { Router } from 'express';
import { z } from 'zod';
import {
    addOrgPosition,
    getAllOrgPositions,
    getOrgCards,
    getSingleOrgPosition,
    updateOrgPosition,
    deleteOrgPosition,
    markPositionVacant,
    addHead,
    getHeads,
    updateHead,
    deleteHead,
} from '../controllers/orgController.js';
import userAuth from '../middleware/authUser.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const emptyToUndefined = (val) =>
    val === '' || val === null || val === undefined ? undefined : val;

const optionalPositiveIntegerId = z.preprocess(
    emptyToUndefined,
    positiveIntegerId.optional(),
);

const optionalNullablePositiveIntegerId = z.preprocess(
    emptyToUndefined,
    positiveIntegerId.nullable().optional(),
);

const employmentCategoryEnum = z.enum([
    'Academic',
    'Administrative',
    'Support',
    'Executive',
    'Leadership',
]);

const holderTypeEnum = z.enum(['PRIMARY', 'ACTING']);
const headStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

const optionalDateOnly = z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional().nullable(),
);

const addPositionSchema = z.object({
    departmentStructureId: positiveIntegerId,
    departmentId: optionalNullablePositiveIntegerId,
    positionName: z
        .string({ required_error: 'positionName is required' })
        .min(1, 'positionName cannot be empty'),
    positionCode: z.string().optional().nullable(),
    employmentCategory: employmentCategoryEnum,
    reportsToOrgPositionId: optionalNullablePositiveIntegerId,
    reportingType: z.string().optional().nullable(),
    isVacant: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
    level: z.coerce.number().int().positive('level must be greater than 0'),
});

const updatePositionSchema = z.object({
    orgPositionId: positiveIntegerId,
    departmentStructureId: optionalPositiveIntegerId,
    departmentId: optionalNullablePositiveIntegerId,
    positionName: z.string().min(1).optional(),
    positionCode: z.string().optional().nullable(),
    employmentCategory: employmentCategoryEnum.optional(),
    reportsToOrgPositionId: optionalNullablePositiveIntegerId,
    reportingType: z.string().optional().nullable(),
    sortOrder: z.coerce.number().int().optional(),
    level: z.coerce.number().int().positive('level must be greater than 0').optional(),
});

const positionIdQuerySchema = z.object({
    orgPositionId: positiveIntegerId,
});

const markVacantSchema = z.object({
    orgPositionId: positiveIntegerId,
});

const addHeadSchema = z.object({
    orgPositionId: positiveIntegerId,
    userId: positiveIntegerId,
    holderType: holderTypeEnum,
    status: headStatusEnum.optional(),
    joiningDate: optionalDateOnly,
    endDate: optionalDateOnly,
});

const updateHeadSchema = z.object({
    orgPositionHeadId: positiveIntegerId,
    holderType: holderTypeEnum.optional(),
    status: headStatusEnum.optional(),
    joiningDate: optionalDateOnly,
    endDate: optionalDateOnly,
});

const headIdQuerySchema = z.object({
    orgPositionHeadId: positiveIntegerId,
});

const listHeadQuerySchema = z.object({
    orgPositionId: positiveIntegerId,
});

router.post(
    '/',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT_ADD.value, 'org'),
    validate({ body: addPositionSchema }),
    addOrgPosition,
);

router.get('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), getAllOrgPositions);

router.get('/cards', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), getOrgCards);

router.get(
    '/single',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT.value, null),
    validate({ query: positionIdQuerySchema }),
    getSingleOrgPosition,
);

router.patch(
    '/',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'org'),
    validate({ body: updatePositionSchema }),
    updateOrgPosition,
);

router.delete(
    '/',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT_DELETE.value, 'org'),
    validate({ query: positionIdQuerySchema }),
    deleteOrgPosition,
);

router.post(
    '/markVacant',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'org'),
    validate({ body: markVacantSchema }),
    markPositionVacant,
);

router.post(
    '/head',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT_ADD.value, 'org'),
    validate({ body: addHeadSchema }),
    addHead,
);

router.get(
    '/head',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT.value, null),
    validate({ query: listHeadQuerySchema }),
    getHeads,
);

router.patch(
    '/head',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'org'),
    validate({ body: updateHeadSchema }),
    updateHead,
);

router.delete(
    '/head',
    userAuth,
    checkAccess(PERMISSIONS.DEPARTMENT_DELETE.value, 'org'),
    validate({ query: headIdQuerySchema }),
    deleteHead,
);

export default router;
