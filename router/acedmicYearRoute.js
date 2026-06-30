import { Router } from 'express';
import { z } from 'zod';
import {
    addacedmicYear,
    getAllacedmicYear,
    updateacedmicYear,
    deleteacedmicYear,
    getActiveAcedmicYearByInstitute,
    getActiveAcedmicYearListByInstituteId,
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
    startingDate: z.coerce
        .string({ required_error: 'startingDate is required' })
        .min(1, 'startingDate cannot be empty'),
    yearTitle: z.coerce.string().min(1).optional(),
    endingDate: z.coerce.string().min(1).optional(),
});

const updateAcedmicYearSchema = z.object({
    academicYearId: positiveIntegerId.optional(),
    yearTitle: z.coerce.string().min(1).optional(),
    startingDate: z.coerce.string().min(1).optional(),
    endingDate: z.coerce.string().min(1).optional(),
}).refine(
    (data) => data.yearTitle || data.startingDate || data.endingDate,
    { message: 'At least one of yearTitle, startingDate, endingDate is required' },
);

const academicYearIdQuerySchema = z.object({
    academicYearId: positiveIntegerId,
});

const instituteIdParamsSchema = z.object({
    instituteId: positiveIntegerId,
});

const activateAndCopySchema = acedmicYearBodySchema.extend({
    copyAcademicYearId: positiveIntegerId.optional(),
    copyData: z.array(z.enum(['subject', 'electiveSubject', 'session'])).min(1).optional(),
}).superRefine((data, ctx) => {
    const hasCopyId = data.copyAcademicYearId != null;
    const hasCopyData = Array.isArray(data.copyData) && data.copyData.length > 0;
    if (hasCopyId !== hasCopyData) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'copyAcademicYearId and copyData must be provided together',
            path: hasCopyId ? ['copyData'] : ['copyAcademicYearId'],
        });
    }
});

/** Upsert + activate for active university and institute (from auth context). */
router.post('/', userAuth, validate({ body: acedmicYearBodySchema }), addacedmicYear);

/** All academic years for active university + institute (active and inactive). */
router.get('/', userAuth, getAllacedmicYear);

/** Update academic year — defaults to active year from X-Academic-Year-Id when academicYearId omitted. */
router.patch('/', userAuth, validate({ body: updateAcedmicYearSchema }), updateacedmicYear);

router.delete('/', userAuth, validate({ query: academicYearIdQuerySchema }), deleteacedmicYear);

/** Active academic years for active institute (from auth context) — returns array. */
router.get('/active', userAuth, getActiveAcedmicYearByInstitute);

/** Active academic years for institute selected at login — returns array. */
router.get(
    '/active/:instituteId',
    userAuth,
    validate({ params: instituteIdParamsSchema }),
    getActiveAcedmicYearListByInstituteId,
);

/** Activate new year and optionally copy data from a previous year. */
router.post(
    '/newActivateAndCopyData',
    userAuth,
    validate({ body: activateAndCopySchema }),
    newActivateAndCopyData,
);

export default router;