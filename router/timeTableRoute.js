import { Router } from 'express';
import { z } from 'zod';
import { addTimeTable, addTimeTablePeriod, addStructureCourseMapping, getTimeTableDetails, getSingleTimeTableDetails, updateTimeTable, deleteTimeTable, deleteTimeTableStructure, updateStructure } from '../controllers/timeTableController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const addTimeTableSchema = z.object({
    name: z.string().trim().min(1, 'name is required'),
    maximumPeriod: z.coerce.number().int().positive(),
    periodLength: z.coerce.number().int().positive().optional(),
    periodGap: z.coerce.number().int().min(0).optional(),
    startingTime: z.string().optional(),
    type: z.enum(['Automatic', 'Manual']),
    weekOff: z.array(z.string()).optional(),
    isCourse: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (data.type !== 'Automatic') {
        return;
    }
    if (!data.startingTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'startingTime is required for Automatic type', path: ['startingTime'] });
    }
    if (data.periodLength == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'periodLength is required for Automatic type', path: ['periodLength'] });
    }
    if (data.periodGap == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'periodGap is required for Automatic type', path: ['periodGap'] });
    }
});

const addStructureCourseMappingSchema = z
    .object({
        timeTableNameId: positiveIntegerId,
        courseId: positiveIntegerId,
        sessionId: positiveIntegerId,
        startingDate: z.string().min(1, 'startingDate is required'),
        endingDate: z.string().min(1, 'endingDate is required'),
    })
    .refine(
        (data) => new Date(data.endingDate) >= new Date(data.startingDate),
        { message: 'endingDate cannot be before startingDate', path: ['endingDate'] },
    );

const updateTimeTableItemSchema = z.object({
    timeTableCreationId: positiveIntegerId,
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    periodName: z.string().optional(),
    isCourse: z.boolean().optional(),
    isBreak: z.boolean().optional(),
    type: z.enum(['Automatic', 'Manual']).optional(),
});

const updateTimeTableSchema = z.array(updateTimeTableItemSchema).min(1, 'request body must be a non-empty array');

const addTimeTablePeriodSchema = z.object({
    timeTableNameId: positiveIntegerId,
    periodName: z.string().trim().min(1, 'periodName cannot be empty').optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    type: z.enum(['Automatic', 'Manual']).optional(),
    isCourse: z.boolean().optional(),
    isBreak: z.boolean().optional(),
});

const deleteTimeTableQuerySchema = z.object({
    timeTableCreationId: positiveIntegerId,
});

const deleteTimeTableStructureQuerySchema = z.object({
    timeTableNameId: positiveIntegerId,
});

const getSingleStructureQuerySchema = z.object({
    timeTableNameId: positiveIntegerId,
});

const updateStructureSchema = z
    .object({
        timetableStructureCourseMapperId: positiveIntegerId,
        timeTableNameId: positiveIntegerId.optional(),
        courseId: positiveIntegerId.optional(),
        sessionId: positiveIntegerId.optional(),
        startingDate: z.string().min(1).optional(),
        endingDate: z.string().min(1).optional(),
    })
    .refine(
        (data) =>
            data.timeTableNameId
            || data.courseId
            || data.sessionId
            || data.startingDate
            || data.endingDate,
        { message: 'Provide at least one field to update' },
    )
    .refine(
        (data) =>
            !data.startingDate
            || !data.endingDate
            || new Date(data.endingDate) >= new Date(data.startingDate),
        { message: 'endingDate cannot be before startingDate', path: ['endingDate'] },
    );

router.post('/', userAuth, validate({ body: addTimeTableSchema }), addTimeTable);
router.post('/courseMapping', userAuth, validate({ body: addStructureCourseMappingSchema }), addStructureCourseMapping);
router.post('/period', userAuth, validate({ body: addTimeTablePeriodSchema }), addTimeTablePeriod);
router.get('/', userAuth, getTimeTableDetails);
router.get('/single', userAuth, validate({ query: getSingleStructureQuerySchema }), getSingleTimeTableDetails);
router.patch('/', userAuth, validate({ body: updateTimeTableSchema }), updateTimeTable);
router.patch('/structure', userAuth, validate({ body: updateStructureSchema }), updateStructure);
router.delete('/', userAuth, validate({ query: deleteTimeTableQuerySchema }), deleteTimeTable);
router.delete('/structure', userAuth, validate({ query: deleteTimeTableStructureQuerySchema }), deleteTimeTableStructure);

export default router;
