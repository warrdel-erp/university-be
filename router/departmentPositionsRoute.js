import { Router } from 'express';
import { z } from 'zod';
import {
    addDepartmentPosition,
    getAllDepartmentPositions,
    getDepartmentPositionCards,
    getSingleDepartmentPosition,
    updateDepartmentPosition,
    deleteDepartmentPosition,
    markDepartmentPositionVacant,
    addUserDepartmentPosition,
    getUserDepartmentPositions,
    updateUserDepartmentPosition,
    deleteUserDepartmentPosition,
    getDepartmentPositionTree,
    getDepartmentPositionChart,
    getDepartmentPositionsByDepartment,
} from '../controllers/departmentPositionsController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const emptyToUndefined = (val) => {
    if (val === '' || val === undefined || val === 'undefined') return undefined;
    if (val === 'null' || val === null) return null;
    return val;
};

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

const addDepartmentPositionSchema = z.object({
    departmentId: optionalNullablePositiveIntegerId,
    positionName: z
        .string({ required_error: 'positionName is required' })
        .min(1, 'positionName cannot be empty'),
    positionCode: z.string().optional().nullable(),
    employmentCategory: employmentCategoryEnum,
    reportingType: z.string().optional().nullable(),
    isVacant: z.boolean().optional(),
    level: z.coerce.number().int().positive('level must be greater than 0'),
});

const updateDepartmentPositionSchema = z.object({
    departmentPositionId: positiveIntegerId,
    departmentId: optionalNullablePositiveIntegerId,
    positionName: z.string().min(1).optional(),
    positionCode: z.string().optional().nullable(),
    employmentCategory: employmentCategoryEnum.optional(),
    reportingType: z.string().optional().nullable(),
    level: z.coerce.number().int().positive('level must be greater than 0').optional(),
});

const departmentPositionIdQuerySchema = z.object({
    departmentPositionId: positiveIntegerId,
});

const departmentIdQuerySchema = z.object({
    departmentId: positiveIntegerId,
});

const markDepartmentPositionVacantSchema = z.object({
    userDepartmentPositionId: positiveIntegerId,
});

const addUserDepartmentPositionSchema = z.object({
    departmentPositionId: positiveIntegerId,
    userId: positiveIntegerId,
    holderType: holderTypeEnum,
    status: headStatusEnum.optional(),
    joiningDate: optionalDateOnly,
    endDate: optionalDateOnly,
});

const updateUserDepartmentPositionSchema = z.object({
    userDepartmentPositionId: positiveIntegerId,
    holderType: holderTypeEnum.optional(),
    status: headStatusEnum.optional(),
    joiningDate: optionalDateOnly,
    endDate: optionalDateOnly,
});

const userDepartmentPositionIdQuerySchema = z.object({
    userDepartmentPositionId: positiveIntegerId,
});

const listUserDepartmentPositionQuerySchema = z.object({
    departmentPositionId: positiveIntegerId,
});

const cardsQuerySchema = z.object({
    changePeriod: z.preprocess(emptyToUndefined, z.enum(['week', 'month', 'year']).optional()),
});

router.post('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_ADD.value, 'departmentPosition'), validate({ body: addDepartmentPositionSchema }), addDepartmentPosition);

router.get('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), getAllDepartmentPositions);

router.get('/cards', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), validate({ query: cardsQuerySchema }), getDepartmentPositionCards);

router.get('/single', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), validate({ query: departmentPositionIdQuerySchema }), getSingleDepartmentPosition);

router.patch('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'departmentPosition'), validate({ body: updateDepartmentPositionSchema }), updateDepartmentPosition);

router.delete('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_DELETE.value, 'departmentPosition'), validate({ query: departmentPositionIdQuerySchema }), deleteDepartmentPosition);

router.post('/markVacant', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'departmentPosition'), validate({ body: markDepartmentPositionVacantSchema }), markDepartmentPositionVacant);

router.post('/head', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_ADD.value, 'departmentPosition'), validate({ body: addUserDepartmentPositionSchema }), addUserDepartmentPosition);

router.get('/head', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), validate({ query: listUserDepartmentPositionQuerySchema }), getUserDepartmentPositions);

router.patch('/head', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'departmentPosition'), validate({ body: updateUserDepartmentPositionSchema }), updateUserDepartmentPosition);

router.delete('/head', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_DELETE.value, 'departmentPosition'), validate({ query: userDepartmentPositionIdQuerySchema }), deleteUserDepartmentPosition);

router.get('/tree', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), getDepartmentPositionTree);

router.get('/chart', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), getDepartmentPositionChart);

router.get('/departmentPositions', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), validate({ query: departmentIdQuerySchema }), getDepartmentPositionsByDepartment);

export default router;
