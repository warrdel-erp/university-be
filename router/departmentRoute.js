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

router.post('/', userAuth, validate({ body: addDepartmentSchema }), addDepartment);

router.get('/', userAuth, getAllDepartment);

router.get('/single', userAuth, validate({ query: departmentIdQuerySchema }), getSingleDepartmentDetails);

router.patch('/', userAuth, validate({ body: updateDepartmentSchema }), updateDepartment);

router.delete('/', userAuth, validate({ query: departmentIdQuerySchema }), deleteDepartment);

router.get('/byId', userAuth, validate({ query: departmentIdQuerySchema }), getDepartmentByIdEmployee);

export default router;
