import { Router } from 'express';
import { z } from 'zod';
import * as examScheduleController from '../controllers/examScheduleController.js';
import * as examRoomCapacityController from '../controllers/examScheduleRoomCapacityController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const addExamRoomCapacitySchema = z.object({
    classRoomSectionIds: z.array(z.number()).min(1, "At least one room is required"),
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

const listWithHallTicketsQuerySchema = z.object({
    sessionId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
    term: z.coerce.number().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    semesterId: z.coerce.number().int().positive().optional(),
    examSetupTypeTermId: z.coerce.number().int().positive().optional(),
});

router.get('/', userAuth, examScheduleController.getExamSchedules);

router.get(
    '/list-with-hall-tickets',
    userAuth,
    validate({ query: listWithHallTicketsQuerySchema }),
    examScheduleController.getExamListWithHallTickets
);

router.get('/:id', userAuth, examScheduleController.getExamScheduleById);

router.post('/assignRoom', userAuth, validate({ body: addExamRoomCapacitySchema }), examRoomCapacityController.addExamRoomCapacity);

router.put('/roomAssignment', userAuth, validate({ body: updateExamRoomCapacitySchema }), examRoomCapacityController.updateExamRoomCapacity);

router.post('/allocateSeats/randomly', userAuth, validate({ body: allocateSeatsSchema }), examScheduleController.allocateSeats);

export default router;