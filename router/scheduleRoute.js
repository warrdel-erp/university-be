import { Router } from 'express';
import { z } from 'zod';
const router = Router();
import {
    addSchedule,
    getAllSchedule,
    getSingleScheduleDetails,
    updateSchedule,
    deleteSchedule,
    assignTeacher,
    getAssignTeacher,
    getMyAssignTeacher,
    attendence,
    addMyAttendence,
    updateAttendence,
    updateMyAttendence,
    getAllAttendence,
    getMyAttendence,
} from "../controllers/scheduleController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const numberId = z.coerce.number();

const addAttendenceSchema = z.object({
    scheduleAssignId: numberId,
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
});

const updateAttendenceSchema = z.object({
    teacherAttendenceId: numberId,
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
});

router.post('/', userAuth, addSchedule);

router.get('/', userAuth, getAllSchedule);

router.get('/single', userAuth, getSingleScheduleDetails);

router.patch('/', userAuth, updateSchedule);

router.delete('/', userAuth, deleteSchedule);

router.post('/assignTeacher', userAuth, assignTeacher);

router.get('/assignTeacher/my', userAuth, getMyAssignTeacher);

router.get('/assignTeacher', userAuth, getAssignTeacher);

router.post('/attendence/my', userAuth, validate({ body: addAttendenceSchema }), addMyAttendence);

router.patch('/attendence/my', userAuth, validate({ body: updateAttendenceSchema }), updateMyAttendence);

router.post('/attendence', userAuth, validate({ body: addAttendenceSchema }), attendence);

router.patch('/attendence', userAuth, validate({ body: updateAttendenceSchema }), updateAttendence);

router.get('/attendence/my', userAuth, getMyAttendence);

router.get('/attendence', userAuth, getAllAttendence);

export default router;
