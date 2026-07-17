import { Router } from 'express';
import { z } from 'zod';
import {
    addDepartment,
    getAllDepartment,
    getSingleDepartmentDetails,
    updateDepartment,
    deleteDepartment,
    getDepartmentByIdEmployee,
} from '../controllers/departmentController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const addDepartmentSchema = z.object({
    subAccountId: positiveIntegerId,
    departmentName: z
        .string({ required_error: 'departmentName is required' })
        .min(1, 'departmentName cannot be empty'),
});

const updateDepartmentSchema = z.object({
    departmentId: positiveIntegerId,
    departmentName: z.string().min(1).optional(),
    subAccountId: positiveIntegerId.optional(),
});

const departmentIdQuerySchema = z.object({
    departmentId: positiveIntegerId,
});

router.post('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_ADD.value, 'department'), validate({ body: addDepartmentSchema }), addDepartment);

router.get('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), getAllDepartment);

router.get('/single', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), validate({ query: departmentIdQuerySchema }), getSingleDepartmentDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_EDIT.value, 'department'), validate({ body: updateDepartmentSchema }), updateDepartment);

router.delete('/', userAuth, checkAccess(PERMISSIONS.DEPARTMENT_DELETE.value, 'department'), validate({ query: departmentIdQuerySchema }), deleteDepartment);

router.get('/byId', userAuth, checkAccess(PERMISSIONS.DEPARTMENT.value, null), validate({ query: departmentIdQuerySchema }), getDepartmentByIdEmployee);

export default router;
