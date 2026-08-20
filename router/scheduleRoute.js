import {Router} from  'express'
const router =  Router();
import {addSchedule,getAllSchedule,getSingleScheduleDetails,updateSchedule,deleteSchedule,assignTeacher,getAssignTeacher,attendence,updateAttendence,getAllAttendence} from "../controllers/scheduleController.js";
import userAuth from "../middleware/authUser.js"
import { z } from "zod";
import { validate } from "../utility/validation.js";

const attendanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD").optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD").optional(),
});

router.post('/', userAuth, addSchedule);

router.get('/', userAuth, getAllSchedule);

router.get('/single' ,userAuth, getSingleScheduleDetails);

router.patch('/' ,userAuth, updateSchedule);

router.delete('/' ,userAuth, deleteSchedule);

router.post('/assignTeacher', userAuth, assignTeacher);

router.get('/assignTeacher', userAuth, getAssignTeacher);

router.post('/attendence', userAuth,attendence);

router.patch('/attendence', userAuth,updateAttendence);

router.get('/attendence', userAuth, validate({ query: attendanceQuerySchema }), getAllAttendence);

export default router;