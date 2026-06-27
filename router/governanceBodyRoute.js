import { Router } from 'express';
import { z } from 'zod';
import {
    createGovernanceBody,
    getAllGovernanceBodies,
    getGovernanceBodyById,
    updateGovernanceBody,
    deleteGovernanceBody,
} from '../controllers/governanceBodyController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { governanceBodyCategories, governanceBodyStatuses } from '../constant.js';

const router = Router();

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable();

const createGovernanceBodySchema = z.object({
    name: z.string({ required_error: 'name is required' }).min(1, 'name cannot be empty'),
    code: z.string({ required_error: 'code is required' }).min(1, 'code cannot be empty'),
    category: z.enum(governanceBodyCategories, {
        required_error: 'category is required',
        invalid_type_error: `category must be one of: ${governanceBodyCategories.join(', ')}`,
    }),
    description: z.string().optional().nullable(),
    parentBodyId: z.coerce.number().int().positive().optional().nullable(),
    constitutedOn: dateOnlySchema,
    effectiveFrom: dateOnlySchema,
    effectiveTo: dateOnlySchema,
    status: z.enum(governanceBodyStatuses).optional(),
});

const updateGovernanceBodySchema = z.object({
    governanceBodyId: z.coerce.number().int().positive(),
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    category: z.enum(governanceBodyCategories).optional(),
    description: z.string().optional().nullable(),
    parentBodyId: z.coerce.number().int().positive().nullable().optional(),
    constitutedOn: dateOnlySchema,
    effectiveFrom: dateOnlySchema,
    effectiveTo: dateOnlySchema,
    status: z.enum(governanceBodyStatuses).optional(),
}).refine(
    (body) => Object.keys(body).some((key) => key !== 'governanceBodyId'),
    { message: 'At least one field other than governanceBodyId is required' },
);

const governanceBodyIdQuerySchema = z.object({
    governanceBodyId: z.coerce.number().int().positive(),
});

router.post('/', userAuth, validate({ body: createGovernanceBodySchema }), createGovernanceBody);
router.get('/', userAuth, getAllGovernanceBodies);
router.get('/single', userAuth, validate({ query: governanceBodyIdQuerySchema }), getGovernanceBodyById);
router.patch('/', userAuth, validate({ body: updateGovernanceBodySchema }), updateGovernanceBody);
router.delete('/', userAuth, validate({ query: governanceBodyIdQuerySchema }), deleteGovernanceBody);

export default router;
