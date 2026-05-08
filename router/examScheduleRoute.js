import { Router } from 'express';
import { z } from 'zod';
import * as examScheduleController from '../controllers/examScheduleController.js';
import * as examRoomCapacityController from '../controllers/examScheduleRoomCapacityController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const classRoomSectionIdsSchema = z.object({
    examScheduleId: z.coerce.number(),
  
    classRoomSectionIds: z
      .array(
        z.object({
          classRoomSectionId: z.coerce.number(),
          orderKey: z.coerce.number().optional()
        })
      )
      .transform((items) =>
        items.map((item) => item.classRoomSectionId)
      )
  });

  
const addExamRoomCapacitySchema = z.object({
    classRoomSectionIds: classRoomSectionIdsSchema.refine((ids) => ids.length > 0, {
        message: "At least one room is required"
    }),
    examScheduleId: z.coerce.number({ required_error: "examScheduleId is required" })
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

export default router;