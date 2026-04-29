import { Router } from 'express';
import { z } from 'zod';
import * as examScheduleController from '../controllers/examScheduleController.js';
import * as examRoomCapacityController from '../controllers/examScheduleRoomCapacityController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const addExamRoomCapacitySchema = z.object({
    classRoomSectionIds: z.array(
        z.union([
            z.number(),
            z.object({
                classRoomSectionId: z.number(),
                orderKey: z.number().int().positive().optional()
            })
        ])
    ).min(1, "At least one room is required"),
    examScheduleId: z.number({ required_error: "examScheduleId is required" })
});

const updateExamRoomCapacitySchema = z.object({
    examScheduleRoomCapacityId: z.number({ required_error: "examScheduleRoomCapacityId is required" }),
    capacity: z.number(),
    columns: z.number()
});

const allocateSeatsSchema = z.object({
    examScheduleId: z.number({ required_error: "examScheduleId is required" })
});

router.get('/', userAuth, examScheduleController.getExamSchedules);

router.get('/:id', userAuth, examScheduleController.getExamScheduleById);

router.post('/assignRoom', userAuth, validate({ body: addExamRoomCapacitySchema }), examRoomCapacityController.addExamRoomCapacity);

router.put('/roomAssignment', userAuth, validate({ body: updateExamRoomCapacitySchema }), examRoomCapacityController.updateExamRoomCapacity);

router.post('/allocateSeats/randomly', userAuth, validate({ body: allocateSeatsSchema }), examScheduleController.allocateSeats);

router.post('/allocateSeats/ascending', userAuth, validate({ body: allocateSeatsSchema }), examScheduleController.allocateSeatsAscending);

router.post('/allocateSeats/descending', userAuth, validate({ body: allocateSeatsSchema }), examScheduleController.allocateSeatsDescending);

export default router;