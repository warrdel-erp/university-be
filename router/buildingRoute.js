import { Router } from 'express';
import { z } from 'zod';
import {
    addbuilding,
    getAllbuilding,
    getSinglebuildingDetails,
    updatebuilding,
    deletebuilding,
    getAllbuildingNested,
} from '../controllers/buildingController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { buildingTypes } from '../constant.js';

const router = Router();

const addBuildingSchema = z.object({
    name: z.string({ required_error: 'name is required' }).min(1, 'name cannot be empty'),
    buildingType: z.enum(buildingTypes, {
        required_error: 'buildingType is required',
        invalid_type_error: `buildingType must be one of: ${buildingTypes.join(', ')}`,
    }),
    description: z.string({ required_error: 'description is required' }).optional(),
    openingTime: z.string({ required_error: 'openingTime is required' }),
    closingTime: z.string({ required_error: 'closingTime is required' }),
});

const updateBuildingSchema = z.object({
    buildingId: z.number({ required_error: 'buildingId is required' }),
    name: z.string().min(1).optional(),
    buildingType: z.enum(buildingTypes).optional(),
    description: z.string().optional(),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
});

const buildingIdQuerySchema = z.object({
    buildingId: z.coerce.number({ required_error: 'buildingId is required' }),
});

const listNestedBuildingQuerySchema = z.object({
    buildingType: z.enum(buildingTypes).optional(),
});

router.post('/', userAuth, validate({ body: addBuildingSchema }), addbuilding);

router.get('/', userAuth, getAllbuilding);

router.get('/single', userAuth, validate({ query: buildingIdQuerySchema }), getSinglebuildingDetails);

router.get('/allNested', userAuth, validate({ query: listNestedBuildingQuerySchema }), getAllbuildingNested);


router.patch('/', userAuth, validate({ body: updateBuildingSchema }), updatebuilding);

router.delete('/', userAuth, validate({ query: buildingIdQuerySchema }), deletebuilding);


export default router;
