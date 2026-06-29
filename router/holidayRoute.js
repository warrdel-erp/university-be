import { Router } from 'express';
import { z } from 'zod';
import { addHoliday, getAllHoliday, getSingleHolidayDetails, updateHoliday, deleteHoliday } from '../controllers/holidayController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const optionalPositiveId = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    positiveIntegerId.optional()
);

const addHolidaySchema = z.object({
    name: z.string().optional(),
    date: z.string().optional(),
    event: z.string().optional(),
    remark: z.string().optional(),
    acedmicYearId: optionalPositiveId,
    instituteId: optionalPositiveId,
});

const getAllHolidayQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    name: z.string().optional(),
    event: z.string().optional(),
    date: z.string().optional(),
    acedmicYearId: optionalPositiveId,
    instituteId: optionalPositiveId,
});

const getSingleHolidayQuerySchema = z.object({
    holidayId: positiveIntegerId,
    acedmicYearId: optionalPositiveId,
    instituteId: optionalPositiveId,
});

const updateHolidaySchema = z.object({
    holidayId: positiveIntegerId,
    name: z.string().optional(),
    date: z.string().optional(),
    event: z.string().optional(),
    remark: z.string().optional(),
    acedmicYearId: optionalPositiveId,
    instituteId: optionalPositiveId,
});

const deleteHolidayQuerySchema = z.object({
    holidayId: positiveIntegerId,
    acedmicYearId: optionalPositiveId,
    instituteId: optionalPositiveId,
});

router.post('/', userAuth, validate({ body: addHolidaySchema }), addHoliday);
router.get('/', userAuth, validate({ query: getAllHolidayQuerySchema }), getAllHoliday);
router.get('/single', userAuth, validate({ query: getSingleHolidayQuerySchema }), getSingleHolidayDetails);
router.patch('/', userAuth, validate({ body: updateHolidaySchema }), updateHoliday);
router.delete('/', userAuth, validate({ query: deleteHolidayQuerySchema }), deleteHoliday);

export default router;
