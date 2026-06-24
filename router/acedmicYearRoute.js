import { Router } from 'express';
import { z } from 'zod';
import {
    addacedmicYear,
    getAllacedmicYear,
    updateacedmicYear,
    deleteacedmicYear,
    getActiveAcedmicYearByInstitute,
    newActivateAndCopyData,
} from '../controllers/acedmicYearController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const acedmicYearBodySchema = z.object({
    yearTitle: z
        .string({ required_error: 'yearTitle is required' })
        .min(1, 'yearTitle cannot be empty'),
    startingDate: z
        .string({ required_error: 'startingDate is required' })
        .min(1, 'startingDate cannot be empty'),
    endingDate: z
        .string({ required_error: 'endingDate is required' })
        .min(1, 'endingDate cannot be empty'),
});

const updateAcedmicYearSchema = z.object({
    acedmicYearId: positiveIntegerId,
    yearTitle: z.string().min(1).optional(),
    startingDate: z.string().min(1).optional(),
    endingDate: z.string().min(1).optional(),
});

const acedmicYearIdQuerySchema = z.object({
    acedmicYearId: positiveIntegerId,
});

const activateAndCopySchema = acedmicYearBodySchema.extend({
    copyAcedmicYearId: positiveIntegerId.optional(),
    copyData: z.array(z.enum(['subject', 'electiveSubject', 'session'])).optional(),
});

/** Upsert + activate for active university and institute (from auth context). */
router.post('/', userAuth, validate({ body: acedmicYearBodySchema }), addacedmicYear);

/** All academic years for active university + institute (active and inactive). */
router.get('/', userAuth, getAllacedmicYear);

/** Update one academic year by id (scoped). */
router.patch('/', userAuth, validate({ body: updateAcedmicYearSchema }), updateacedmicYear);

router.delete('/', userAuth, validate({ query: acedmicYearIdQuerySchema }), deleteacedmicYear);

/** Active academic years for active institute (instituteId + isActive only) — returns array. */
router.get('/active', userAuth, getActiveAcedmicYearByInstitute);

/** Activate new year and optionally copy data from a previous year. */
router.post(
    '/newActivateAndCopyData',
    userAuth,
    validate({ body: activateAndCopySchema }),
    newActivateAndCopyData,
);

export default router;
