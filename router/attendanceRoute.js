import {Router} from  'express'
const router =  Router();
import {addAttendance,getAttendanceDetails,updateAttendance} from "../controllers/attendanceController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addAttendance);

router.get('/', userAuth, getAttendanceDetails);

router.patch('/' ,userAuth, updateAttendance);

export default router;