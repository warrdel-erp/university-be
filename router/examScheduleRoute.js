import { Router } from 'express';
import { z } from 'zod';
import * as examScheduleController from '../controllers/examScheduleController.js';
import * as examRoomCapacityController from '../controllers/examScheduleRoomCapacityController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const addExamRoomCapacitySchema = z.object({
    classRoomSectionId: z.number({ required_error: "classRoomSectionId is required" }),
    examScheduleId: z.number({ required_error: "examScheduleId is required" })
});

const updateExamRoomCapacitySchema = z.object({
    examScheduleRoomCapacityId: z.number({ required_error: "examScheduleRoomCapacityId is required" }),
    capacity: z.number(),
    columns: z.number()
});

router.get('/', userAuth, examScheduleController.getExamSchedules);

router.get('/:id', userAuth, examScheduleController.getExamScheduleById);

router.post('/assignRoom', userAuth, validate({ body: addExamRoomCapacitySchema }), examRoomCapacityController.addExamRoomCapacity);

router.put('/roomAssignment', userAuth, validate({ body: updateExamRoomCapacitySchema }), examRoomCapacityController.updateExamRoomCapacity);

export default router;
