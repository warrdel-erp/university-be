import { Router } from 'express';
import { z } from 'zod';
import {
    addSubAccount,
    getAllAccount,
    getAllSubAccount,
    getSingleSubAccountDetails,
    updateSubAccount,
    deleteSubAccount,
} from '../controllers/subAccountController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const optionalString = z.string().optional().nullable();

const addSubAccountSchema = z.object({
    accountId: positiveIntegerId,
    departmentName: z
        .string({ required_error: 'departmentName is required' })
        .min(1, 'departmentName cannot be empty'),
    alternateName: optionalString,
    departmentCode: optionalString,
    description: optionalString,
});

const updateSubAccountSchema = z.object({
    subAccountId: positiveIntegerId,
    accountId: positiveIntegerId.optional(),
    departmentName: z.string().min(1).optional(),
    alternateName: optionalString,
    departmentCode: optionalString,
    description: optionalString,
});

const subAccountIdQuerySchema = z.object({
    subAccountId: positiveIntegerId,
});

router.post('/', userAuth, validate({ body: addSubAccountSchema }), addSubAccount);

router.get('/', userAuth, getAllSubAccount);

router.get('/single', userAuth, validate({ query: subAccountIdQuerySchema }), getSingleSubAccountDetails);

router.patch('/', userAuth, validate({ body: updateSubAccountSchema }), updateSubAccount);

router.delete('/', userAuth, validate({ query: subAccountIdQuerySchema }), deleteSubAccount);

router.get('/account', userAuth, getAllAccount);

export default router;
