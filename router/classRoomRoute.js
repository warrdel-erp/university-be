import { Router } from 'express';
import { z } from 'zod';
import { addClassRoom, getAllClassRoom, getSingleClassRoomDetails, updateClassRoom, deleteClassRoom } from "../controllers/classRoomController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from '../utility/validation.js';

const router = Router();

const addClassRoomSchema = z.object({
    roomNumber: z.string({ required_error: "roomNumber is required" }),
    capacity: z.number({ required_error: "capacity is required" }),
    floorId: z.number({ required_error: "floorId is required" }),
    examCapacity: z.number().nullable().optional(),
    examCapacityColumns: z.number().nullable().optional()
});

const updateClassRoomSchema = z.object({
    classRoomSectionId: z.number({ required_error: "classRoomSectionId is required" }),
    roomNumber: z.string().optional(),
    capacity: z.number().optional(),
    floorId: z.number().optional(),
    examCapacity: z.number().nullable().optional(),
    examCapacityColumns: z.number().nullable().optional()
});

const getSingleClassRoomSchema = z.object({
    classRoomSectionId: z.coerce.number({ required_error: "classRoomSectionId is required" })
});

const deleteClassRoomSchema = z.object({
    classRoomSectionId: z.coerce.number({ required_error: "classRoomSectionId is required" })
});

router.post('/', userAuth, validate({ body: addClassRoomSchema }), addClassRoom);

router.get('/', userAuth, getAllClassRoom);

router.get('/single', userAuth, validate({ query: getSingleClassRoomSchema }), getSingleClassRoomDetails);

router.patch('/', userAuth, validate({ body: updateClassRoomSchema }), updateClassRoom);

router.delete('/', userAuth, validate({ query: deleteClassRoomSchema }), deleteClassRoom);

export default router;