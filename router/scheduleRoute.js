import {Router} from  'express'
const router =  Router();
import {addSchedule,getAllSchedule,getSingleScheduleDetails,updateSchedule,deleteSchedule,assignTeacher,getAssignTeacher} from "../controllers/scheduleController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addSchedule);

router.get('/', userAuth, getAllSchedule);

router.get('/single' ,userAuth, getSingleScheduleDetails);

router.patch('/' ,userAuth, updateSchedule);

router.delete('/' ,userAuth, deleteSchedule);

router.post('/assignTeacher', userAuth, assignTeacher);

router.get('/assignTeacher', userAuth, getAssignTeacher);

export default router;