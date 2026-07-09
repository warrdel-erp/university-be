import { Router } from 'express';
import { z } from 'zod';
import { addTimeTable, getTimeTableDetails, getSingleTimeTableDetails, updateTimeTable, deleteTimeTable, getAllTimeTableName } from '../controllers/timeTableController.js';
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

const getTimeTableQuerySchema = z.object({
    courseId: optionalPositiveId,
});

const getAllTimeTableNameQuerySchema = z.object({
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
});

const getSingleTimeTableQuerySchema = z.object({
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
});

const addTimeTableSchema = z.object({
    name: z.string().optional(),
    maximumPeriod: z.coerce.number().int().positive().optional(),
    periodLength: z.coerce.number().int().positive().optional(),
    periodGap: z.coerce.number().int().min(0).optional(),
    startingTime: z.string().optional(),
    type: z.enum(['Automatic', 'Manual']).optional(),
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
    weekOff: z.array(z.string()).optional(),
    isCourse: z.boolean().optional(),
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

const deleteTimeTableQuerySchema = z.object({
    timeTableCreationId: positiveIntegerId,
});

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null), validate({ body: addTimeTableSchema }), addTimeTable);
router.get('/all_name', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null), validate({ query: getAllTimeTableNameQuerySchema }), getAllTimeTableName);
router.get('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null), validate({ query: getTimeTableQuerySchema }), getTimeTableDetails);
router.get('/single', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null), validate({ query: getSingleTimeTableQuerySchema }), getSingleTimeTableDetails);
router.patch('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_EDIT.value, null), validate({ body: updateTimeTableSchema }), updateTimeTable);
router.delete('/', userAuth, checkAccess(PERMISSIONS.TIME_TABLE_SETUP_DELETE.value, null), validate({ query: deleteTimeTableQuerySchema }), deleteTimeTable);

export default router;
