import { Router } from 'express';
import { z } from 'zod';
import {
    addHead,
    getAllHead,
    getSingleHeadDetails,
    updateHead,
    deleteHead,
} from '../controllers/headController.js';
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

const addHeadSchema = z.object({
    headName: z
        .string({ required_error: 'headName is required' })
        .min(1, 'headName cannot be empty'),
    designation: z
        .string({ required_error: 'designation is required' })
        .min(1, 'designation cannot be empty'),
    mobileNumber: optionalString,
    alternateNumber: optionalString,
    registerEmail: z
        .string({ required_error: 'registerEmail is required' })
        .email('registerEmail must be valid'),
    alternateEmail: optionalString,
    address: optionalString,
    university: optionalString,
    typeOfInstitute: optionalString,
    location: optionalString,
    financialStatus: optionalString,
    isAdmin: z.boolean().optional().default(false),
});

const updateHeadSchema = z.object({
    headId: positiveIntegerId,
    headName: z.string().min(1).optional(),
    designation: z.string().min(1).optional(),
    mobileNumber: optionalString,
    alternateNumber: optionalString,
    registerEmail: z.string().email().optional(),
    alternateEmail: optionalString,
    address: optionalString,
    university: optionalString,
    typeOfInstitute: optionalString,
    location: optionalString,
    financialStatus: optionalString,
    isAdmin: z.boolean().optional(),
});

const headIdQuerySchema = z.object({
    headId: positiveIntegerId,
});

router.post('/', userAuth, checkAccess(PERMISSIONS.HEAD_OF_THE_INSTITUTION_ADD.value, 'head'), validate({ body: addHeadSchema }), addHead);

router.get('/', userAuth, getAllHead);

router.get('/single', userAuth, validate({ query: headIdQuerySchema }), getSingleHeadDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.HEAD_OF_THE_INSTITUTION_EDIT.value, 'head'), validate({ body: updateHeadSchema }), updateHead);

router.delete('/', userAuth, checkAccess(PERMISSIONS.HEAD_OF_THE_INSTITUTION_DELETE.value, 'head'), validate({ query: headIdQuerySchema }), deleteHead);

export default router;
