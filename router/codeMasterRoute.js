import { Router } from 'express';
import { z } from 'zod';
import {
    getAllEmployeeType,
    addEmployeeCode,
    getEmployeeCodesTypes,
    updateCodeMasterType,
    deleteCodeMasterType,
} from '../controllers/codeMasterController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const optionalString = z.string().optional().nullable();

const addEmployeeCodeSchema = z.object({
    employeeCodeMasterId: positiveIntegerId,
    code: z.string({ required_error: 'code is required' }).min(1, 'code cannot be empty'),
    description: optionalString,
});

const getCodesTypesQuerySchema = z.object({
    employeeCodeMasterId: z.coerce.number().int().positive().optional(),
    key: z.string().optional(),
});

const updateCodeMasterTypeSchema = z.object({
    code: z.string().min(1).optional(),
    description: optionalString,
});

const employeeCodeMasterTypeIdParamSchema = z.object({
    employeeCodeMasterTypeId: positiveIntegerId,
});

router.get('/', userAuth, getAllEmployeeType);

router.post('/addCode', userAuth, validate({ body: addEmployeeCodeSchema }), addEmployeeCode);

router.get('/getCodesTypes', userAuth, validate({ query: getCodesTypesQuerySchema }), getEmployeeCodesTypes);

router.patch(
    '/:employeeCodeMasterTypeId',
    userAuth,
    validate({ params: employeeCodeMasterTypeIdParamSchema, body: updateCodeMasterTypeSchema }),
    updateCodeMasterType,
);

router.delete(
    '/:employeeCodeMasterTypeId',
    userAuth,
    validate({ params: employeeCodeMasterTypeIdParamSchema }),
    deleteCodeMasterType,
);

export default router;
