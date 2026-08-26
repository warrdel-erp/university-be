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
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';

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
    search: z.string().optional(),
});

const updateCodeMasterTypeSchema = z.object({
    code: z.string().min(1).optional(),
    description: optionalString,
});

const employeeCodeMasterTypeIdParamSchema = z.object({
    employeeCodeMasterTypeId: positiveIntegerId,
});

router.get('/', userAuth, getAllEmployeeType);

router.post('/addCode', userAuth, checkAccess(PERMISSIONS.CODE_MASTER_ADD.value), validate({ body: addEmployeeCodeSchema }), addEmployeeCode);

router.get('/getCodesTypes', userAuth, validate({ query: getCodesTypesQuerySchema }), getEmployeeCodesTypes);

router.patch(
    '/:employeeCodeMasterTypeId',
    userAuth,
    checkAccess(PERMISSIONS.CODE_MASTER_EDIT.value),
    validate({ params: employeeCodeMasterTypeIdParamSchema, body: updateCodeMasterTypeSchema }),
    updateCodeMasterType,
);

router.delete(
    '/:employeeCodeMasterTypeId',
    userAuth,
    checkAccess(PERMISSIONS.CODE_MASTER_DELETE.value),
    validate({ params: employeeCodeMasterTypeIdParamSchema }),
    deleteCodeMasterType,
);

export default router;
