import { Router } from 'express';
import { z } from 'zod';
import * as examRoomCapacityController from '../controllers/examRoomCapacityController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const addExamRoomCapacitySchema = z.object({
    classRoomSectionId: z.number({ required_error: "classRoomSectionId is required" }),
    capacity: z.number({ required_error: "capacity is required" }),
    columns: z.number({ required_error: "columns is required" })
});

const getExamRoomCapacitiesSchema = z.object({
    classRoomSectionId: z.coerce.number({ required_error: "classRoomSectionId is required" })
});

const updateExamRoomCapacitySchema = z.object({
    examRoomCapacityId: z.number({ required_error: "examRoomCapacityId is required" }),
    capacity: z.number().optional(),
    columns: z.number().optional()
});

const deleteExamRoomCapacitySchema = z.object({
    examRoomCapacityId: z.coerce.number({ required_error: "examRoomCapacityId is required" })
});

const toggleExamRoomCapacityStatusSchema = z.object({
    examRoomCapacityId: z.coerce.number({ required_error: "examRoomCapacityId is required" })
});

router.post('/', userAuth, validate({ body: addExamRoomCapacitySchema }), examRoomCapacityController.addExamRoomCapacity);

router.get('/', userAuth, validate({ query: getExamRoomCapacitiesSchema }), examRoomCapacityController.getExamRoomCapacities);

router.put('/', userAuth, validate({ body: updateExamRoomCapacitySchema }), examRoomCapacityController.updateExamRoomCapacity);

router.patch('/active/:examRoomCapacityId', userAuth, validate({ params: toggleExamRoomCapacityStatusSchema }), examRoomCapacityController.activateExamRoomCapacity);

router.delete('/:examRoomCapacityId', userAuth, validate({ params: deleteExamRoomCapacitySchema }), examRoomCapacityController.deleteExamRoomCapacity);

export default router;
