import {Router} from  'express'
const router =  Router();
import {addSchedule,getAllSchedule,getSingleScheduleDetails,updateSchedule,deleteSchedule} from "../controllers/scheduleController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addSchedule);

router.get('/', userAuth, getAllSchedule);

router.get('/single' ,userAuth, getSingleScheduleDetails);

router.patch('/' ,userAuth, updateSchedule);

router.delete('/' ,userAuth, deleteSchedule);

export default router;