import { Router } from 'express';
import { z } from 'zod';
import { addTimeTable, addTimeTablePeriod, getTimeTableDetails, getSingleTimeTableDetails, updateTimeTable, deleteTimeTable, deleteTimeTableStructure, getAllTimeTableName, updateStructureEndingDate } from '../controllers/timeTableController.js';
import userAuth from '../middleware/authUser.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';
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

const timeTableListQuerySchema = z.object({
    courseId: optionalPositiveId,
});

const addTimeTableSchema = z.object({
    name: z.string().trim().min(1, 'name is required'),
    maximumPeriod: z.coerce.number().int().positive(),
    periodLength: z.coerce.number().int().positive().optional(),
    periodGap: z.coerce.number().int().min(0).optional(),
    startingTime: z.string().optional(),
    startingDate: z.string().min(1, 'startingDate is required'),
    endingDate: z.string().min(1, 'endingDate is required'),
    type: z.enum(['Automatic', 'Manual']),
    courseId: positiveIntegerId,
    weekOff: z.array(z.string()).optional(),
    isCourse: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (new Date(data.endingDate) < new Date(data.startingDate)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'endingDate cannot be before startingDate',
            path: ['endingDate'],
        });
    }
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

const updateStructureEndingDateSchema = z.object({
    timeTableNameId: positiveIntegerId,
    endingDate: z.string().min(1, 'endingDate is required'),
});

router.post('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null), validate({ body: addTimeTableSchema }), addTimeTable);
router.post('/period', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null), validate({ body: addTimeTablePeriodSchema }), addTimeTablePeriod);
router.get('/all_name', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null), validate({ query: timeTableListQuerySchema }), getAllTimeTableName);
router.get('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null), validate({ query: timeTableListQuerySchema }), getTimeTableDetails);
router.get('/single', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null), validate({ query: timeTableListQuerySchema }), getSingleTimeTableDetails);
router.patch('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_EDIT.value, null), validate({ body: updateTimeTableSchema }), updateTimeTable);
router.patch('/structure', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_EDIT.value, null), validate({ body: updateStructureEndingDateSchema }), updateStructureEndingDate);
router.delete('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_DELETE.value, null), validate({ query: deleteTimeTableQuerySchema }), deleteTimeTable);
router.delete('/structure', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_DELETE.value, null), validate({ query: deleteTimeTableStructureQuerySchema }), deleteTimeTableStructure);

export default router;
